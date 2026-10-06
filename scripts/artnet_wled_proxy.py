#!/usr/bin/env python3
"""
Art-Net -> WLED production override proxy (FGC 2026).

In FGC 2026 the field robot drives the WLED goal LEDs and light sticks from
`fcs:*` events sent by EMS. Each command is sent once and never repeated
("fire and forget"). This proxy runs quietly next to that. When production
turns on the override (from Companion), the lights follow a lighting console
over Art-Net. When the override is off, or the console sends "normal", or the
console stops sending, the lights go back to whatever the game last set.

Uses only the Python 3 standard library and runs on a Raspberry Pi 4 as a
systemd service.

-------------------------------------------------------------------------------
FIXTURE (one 5-channel fixture drives every WLED host)
-------------------------------------------------------------------------------
  Ch 1  Intensity (master dimmer for every mode)
  Ch 2  Type select
          0 -   9  Normal   game/EMS control (production releases the lights)
         10 -  84  RGB      solid color from ch 3-5
         85 - 169  Rainbow  WLED onboard "Rainbow" effect, runs continuously
        170 - 255  Fire     WLED onboard "Fire 2012" effect, runs continuously
  Ch 3  Red
  Ch 4  Green
  Ch 5  Blue

The Art-Net universe (15-bit port address) and DMX start address are set in
the config file. Patch a generic 5-channel fixture on the console.

-------------------------------------------------------------------------------
HOW IT TAKES CONTROL
-------------------------------------------------------------------------------
Production has the lights only when ALL of these are true:
  * the override is enabled (HTTP API below);
  * an Art-Net frame arrived within `artnet_timeout_s`, so if the console
    crashes or is unplugged, control goes back to the game;
  * ch 2 >= 10.

RGB     Streams pixels with WLED's realtime UDP protocol (DNRGB, port 21324).
        WLED shows realtime data on top of its normal state but still accepts
        the robot's JSON commands underneath. When the stream stops, WLED
        shows the game's latest state again.
Fire /  Uses WLED's JSON API to start the onboard effect. The game's state is
Rainbow saved first and put back on release. If the game changes the lights
        while an effect is running, the proxy keeps the change as the new
        restore point and starts the effect again (checked every
        `fx_check_s`).
        Entering, switching and leaving an effect crossfade over `transition_s`
        using WLED's one-off `tt` transition, so the controller's own default
        transition is never changed. RGB -> effect also fades: the controller is
        first set to a solid matching the streamed color, then dropped out of
        realtime (no visible change), then crossfaded. Switching INTO RGB, and
        RGB -> game, are instant cuts, because WLED doesn't fade realtime streams.
        Known limit: WLED cannot report per-pixel score fills, so after an
        effect a goal may show a solid color until the robot's next update.

-------------------------------------------------------------------------------
HTTP API  (default port 8091, GET or POST both work, so Companion can use either)
-------------------------------------------------------------------------------
  /override/enable    (alias /override/on)   production can take control
  /override/disable   (alias /override/off)  lights always follow the game
  /override/toggle
  /override/disabledToFire  (alias /disabledToFire)
                      ONE-SHOT. Turns the console off, fades whatever is
                      showing to the onboard Fire effect (at
                      `disabled_fire_intensity`), then the proxy lets go
                      completely: nothing is held, re-applied or restored.
                      The field shows Fire until a field robot sends its
                      next command, which takes effect normally. Afterwards
                      the state is the same as /override/disable. A
                      controller offline for more than `fire_cue_expiry_s`
                      skips the cue.
  /override           current {override, state: off|console, mode, reason}
  /status             full status: console, DMX values, every WLED host
  /health             {"ok": true}

  Companion: use the "Generic HTTP" module. Make a button that sends a GET to
  http://<pi-ip>:8091/override/toggle, and poll /override for button feedback.

-------------------------------------------------------------------------------
WLED PREREQUISITES (on every controller: Config -> Sync Interfaces -> Realtime)
-------------------------------------------------------------------------------
  * "Receive UDP realtime" enabled (the default).
  * "Force max brightness" recommended. Otherwise realtime RGB is also scaled
    by whatever brightness the game last set. Ch 1 already dims the output.
  * "Use main segment only" disabled, so RGB covers the whole strip.
  The Pi must be on the same network as both the WLEDs and the console.

-------------------------------------------------------------------------------
INSTALL / RUN
-------------------------------------------------------------------------------
  sudo python3 artnet_wled_proxy.py install-service
      Writes /etc/artnet-wled-proxy.json (if missing) and the systemd unit,
      then enables and starts the service.
  sudo nano /etc/artnet-wled-proxy.json      # set wled_hosts (per field), universe, address
  sudo systemctl restart artnet-wled-proxy
  journalctl -u artnet-wled-proxy -f

  python3 artnet_wled_proxy.py [--config FILE] run       # run in the foreground
  python3 artnet_wled_proxy.py test-send --mode 50 --r 255 --dim 200
      Sends Art-Net frames so you can test without a console
      (see `test-send --help`).
"""

import argparse
import copy
import json
import logging
import os
import signal
import socket
import struct
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from collections import namedtuple
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

LOG = logging.getLogger("artnet-wled-proxy")

SERVICE_NAME = "artnet-wled-proxy"
DEFAULT_CONFIG_PATH = "/etc/artnet-wled-proxy.json"

# =============================================================================
# Configuration
# =============================================================================

DEFAULT_CONFIG = {
    # WLED controllers (goals + sticks): IP or hostname, optionally "host:port"
    # for the HTTP API. Any number is supported, each on its own thread, and
    # every one follows the same fixture. Either a flat list:
    #   ["10.0.1.21", "10.0.1.22", ...]
    # or grouped by field (the grouping is only for logs and /status):
    #   {"Field 1": ["10.0.1.21", "10.0.1.22"], "Field 2": ["10.0.2.21"], ...}
    "wled_hosts": ["192.168.80.118","192.168.80.128","192.168.80.138","192.168.80.148","192.168.80.158",],
    # Art-Net input
    "artnet_bind": "0.0.0.0",
    "artnet_universe": 23,  # 15-bit port address (Net << 8 | Sub-Net << 4 | Universe)
    "dmx_start_address": 1,  # 1-based; the fixture uses this address + 4
    "artnet_timeout_s": 3.0,  # no frames for this long -> give control back to the game
    "node_name": "EMS LED Proxy",  # shown on the console's Art-Net node list
    # HTTP API (Companion)
    "api_bind": "0.0.0.0",
    "api_port": 8091,
    "override_on_boot": False,
    # WLED output
    "output_hz": 40,
    "realtime_port": 21324,
    "realtime_timeout_s": 2,  # WLED returns to normal this long after the last RGB frame
    "http_timeout_s": 1.5,  # WLED on Wi-Fi can be slow to answer, especially while streaming
    "info_refresh_s": 30,  # how often LED count / effect list / reachability are refreshed
    "fx_check_s": 1.0,  # how often a running effect is checked for game changes
    # WLED crossfade when entering/switching effects and when handing back to the
    # game from an effect. RGB is a realtime stream, which WLED always cuts to instantly.
    "transition_s": 0.7,
    "disabled_fire_intensity": 255,  # brightness used by /override/disabledToFire
    "fire_cue_expiry_s": 10,  # a controller offline longer than this skips the fire cue
    # Effects are looked up by name on each WLED. The fallback IDs are used only
    # if a name is not found.
    "fire": {
        "effect": "Fire 2012",
        "palette": "Fire",
        "speed": 128,
        "intensity": 160,
        "fallback_effect_id": 66,
        "fallback_palette_id": 35,
    },
    "rainbow": {
        "effect": "Rainbow",
        "palette": "Default",
        "speed": 128,
        "intensity": 128,
        "fallback_effect_id": 9,
        "fallback_palette_id": 0,
    },
    "log_level": "INFO",
}


def load_config(path=None):
    cfg = copy.deepcopy(DEFAULT_CONFIG)
    if path is None and os.path.exists(DEFAULT_CONFIG_PATH):
        path = DEFAULT_CONFIG_PATH
    if path is not None:
        with open(path, "r", encoding="utf-8") as f:
            user = json.load(f)
        for key, value in user.items():
            if key.startswith("_"):
                continue  # "_comment" etc.
            if key not in cfg:
                LOG.warning("Unknown config key %r ignored", key)
            elif isinstance(cfg[key], dict) and isinstance(value, dict):
                cfg[key].update(value)
            else:
                cfg[key] = value
    validate_config(cfg)
    return cfg, path


def controller_list(cfg):
    """[(field, host)] from `wled_hosts` (a flat list, or a dict of field -> list).
    Duplicate hosts are dropped so a controller is never driven by two threads."""
    hosts = cfg["wled_hosts"]
    if isinstance(hosts, dict):
        pairs = []
        for field, field_hosts in hosts.items():
            if not isinstance(field_hosts, list):
                raise ValueError("wled_hosts[%r] must be a list of hosts" % field)
            pairs.extend((str(field), h) for h in field_hosts)
    elif isinstance(hosts, list):
        pairs = [(None, h) for h in hosts]
    else:
        raise ValueError("wled_hosts must be a list of hosts or a dict of field -> list of hosts")
    seen, result = {}, []
    for field, host in pairs:
        if not isinstance(host, str) or not host.strip():
            raise ValueError("invalid WLED host %r" % (host,))
        host = host.strip()
        if host in seen:
            LOG.warning("WLED host %s is listed more than once (field %s and %s); using the first", host, seen[host], field)
            continue
        seen[host] = field
        result.append((field, host))
    return result


def validate_config(cfg):
    controller_list(cfg)
    if not 0 <= int(cfg["artnet_universe"]) <= 0x7FFF:
        raise ValueError("artnet_universe must be 0-32767")
    if not 1 <= int(cfg["dmx_start_address"]) <= 512 - (FIXTURE_CHANNELS - 1):
        raise ValueError("dmx_start_address must be 1-%d" % (512 - (FIXTURE_CHANNELS - 1)))
    if float(cfg["output_hz"]) <= 0:
        raise ValueError("output_hz must be > 0")


# =============================================================================
# Fixture / modes
# =============================================================================

FIXTURE_CHANNELS = 5
CH_DIM, CH_FEATURE, CH_R, CH_G, CH_B = range(FIXTURE_CHANNELS)

RELEASE = "RELEASE"
RGB = "RGB"
FIRE = "FIRE"
RAINBOW = "RAINBOW"
FX_MODES = (FIRE, RAINBOW)
FX_CONFIG_KEY = {FIRE: "fire", RAINBOW: "rainbow"}


def mode_from_feature(value):
    if value < 10:
        return RELEASE
    if value < 85:
        return RGB
    if value < 170:
        return RAINBOW
    return FIRE


def scale(value, dim):
    return (value * dim + 127) // 255


Desired = namedtuple("Desired", "mode r g b dim reason")

# =============================================================================
# Shared state: override flag + latest DMX from the console
# =============================================================================


class Controller:
    def __init__(self, cfg):
        self.cfg = cfg
        self.lock = threading.Lock()
        self.override = bool(cfg["override_on_boot"])
        # One-shot "disabled to fire" cue: (id, monotonic time). Each controller
        # fades to Fire once per id, then lets go.
        self.fire_cue = (0, 0.0)
        self.channels = [0] * FIXTURE_CHANNELS
        self.last_rx = None  # monotonic time of last matching ArtDMX frame
        self.source = None
        self.frames = 0
        self._last_logged = None
        self.started = time.monotonic()

    # --- console input -------------------------------------------------------
    def update_dmx(self, channels, source):
        with self.lock:
            if source != self.source:
                LOG.info("Art-Net source is now %s", source)
                self.source = source
            self.channels = channels
            self.last_rx = time.monotonic()
            self.frames += 1

    # --- override ------------------------------------------------------------
    def set_override(self, enabled, who):
        with self.lock:
            changed = self.override != enabled
            self.override = enabled
        if changed:
            LOG.info("Production override %s (by %s)", "ENABLED" if enabled else "DISABLED", who)
        return self.summary()

    def toggle_override(self, who):
        with self.lock:
            enabled = not self.override
        return self.set_override(enabled, who)

    def disabled_to_fire(self, who):
        """Console off, then a ONE-SHOT cue: every controller fades to the onboard Fire
        effect once and the proxy lets go. Nothing is held, re-applied or restored, so
        the field robots' next commands take effect normally."""
        with self.lock:
            self.override = False
            self.fire_cue = (self.fire_cue[0] + 1, time.monotonic())
        LOG.info("Console control DISABLED; one-shot fade to FIRE, then hands off (by %s)", who)
        return self.summary()

    def pending_fire_cue(self):
        """(id) of a fire cue still worth running, or None. A controller that was offline
        when the cue was sent must not jump to Fire minutes later, so cues expire."""
        with self.lock:
            cue_id, at = self.fire_cue
        if cue_id and time.monotonic() - at <= float(self.cfg["fire_cue_expiry_s"]):
            return cue_id
        return None

    def summary(self):
        d = self.desired()
        with self.lock:
            override = self.override
        return {"override": override, "state": "console" if override else "off", "mode": d.mode, "reason": d.reason}

    # --- what the lights should be doing right now ----------------------------
    def desired(self):
        with self.lock:
            override = self.override
            ch = list(self.channels)
            last_rx = self.last_rx
        now = time.monotonic()
        if not override:
            d = Desired(RELEASE, 0, 0, 0, 0, "override disabled")
        elif last_rx is None or now - last_rx > float(self.cfg["artnet_timeout_s"]):
            d = Desired(RELEASE, 0, 0, 0, 0, "no Art-Net from console")
        else:
            mode = mode_from_feature(ch[CH_FEATURE])
            reason = "console ch2 normal" if mode == RELEASE else "console"
            d = Desired(mode, ch[CH_R], ch[CH_G], ch[CH_B], ch[CH_DIM], reason)
        key = (d.mode, d.reason)
        with self.lock:
            if key != self._last_logged:
                self._last_logged = key
                LOG.info("Mode -> %s (%s)", d.mode, d.reason)
        return d

    def console_status(self):
        with self.lock:
            ch = list(self.channels)
            last_rx, source, frames = self.last_rx, self.source, self.frames
        age = None if last_rx is None else round(time.monotonic() - last_rx, 2)
        return {
            "alive": age is not None and age <= float(self.cfg["artnet_timeout_s"]),
            "source": source,
            "last_frame_age_s": age,
            "frames": frames,
            "channels": {
                "r": ch[CH_R],
                "g": ch[CH_G],
                "b": ch[CH_B],
                "feature": ch[CH_FEATURE],
                "feature_mode": mode_from_feature(ch[CH_FEATURE]),
                "intensity": ch[CH_DIM],
            },
        }


# =============================================================================
# Art-Net input
# =============================================================================

ARTNET_PORT = 6454
ARTNET_ID = b"Art-Net\x00"
OP_POLL = 0x2000
OP_POLL_REPLY = 0x2100
OP_DMX = 0x5000


def local_ip_for(dest):
    """The local IP this host would use to reach `dest`."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect((dest, ARTNET_PORT))
        return s.getsockname()[0]
    except OSError:
        return "0.0.0.0"
    finally:
        s.close()


def build_artdmx(universe, data, sequence=0):
    return (
        ARTNET_ID
        + struct.pack("<H", OP_DMX)
        + struct.pack(">H", 14)
        + bytes((sequence & 0xFF, 0, universe & 0xFF, (universe >> 8) & 0x7F))
        + struct.pack(">H", len(data))
        + bytes(data)
    )


class ArtNetListener(threading.Thread):
    def __init__(self, cfg, controller, stop):
        super().__init__(name="artnet", daemon=True)
        self.cfg = cfg
        self.controller = controller
        self.stop = stop
        self.universe = int(cfg["artnet_universe"])
        self.start_index = int(cfg["dmx_start_address"]) - 1
        self.poll_replies = 0
        # Bind here so a port conflict fails startup instead of failing silently.
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        self.sock.bind((cfg["artnet_bind"], ARTNET_PORT))
        self.sock.settimeout(0.5)

    def run(self):
        LOG.info(
            "Listening for Art-Net on %s:%d, universe %d, address %d-%d",
            self.cfg["artnet_bind"],
            ARTNET_PORT,
            self.universe,
            self.start_index + 1,
            self.start_index + FIXTURE_CHANNELS,
        )
        while not self.stop.is_set():
            try:
                data, addr = self.sock.recvfrom(2048)
            except socket.timeout:
                continue
            except OSError as e:
                LOG.warning("Art-Net receive error: %s", e)
                self.stop.wait(0.5)
                continue
            try:
                self.handle(data, addr)
            except Exception:  # never let one bad packet kill the listener
                LOG.exception("Error handling Art-Net packet from %s", addr[0])
        self.sock.close()

    def handle(self, data, addr):
        if len(data) < 10 or data[:8] != ARTNET_ID:
            return
        op = struct.unpack_from("<H", data, 8)[0]
        if op == OP_DMX:
            self.handle_dmx(data, addr)
        elif op == OP_POLL:
            self.send_poll_reply(addr)

    def handle_dmx(self, data, addr):
        if len(data) < 18:
            return
        port_address = data[14] | ((data[15] & 0x7F) << 8)
        if port_address != self.universe:
            return
        length = (data[16] << 8) | data[17]
        payload = data[18 : 18 + length]
        start = self.start_index
        channels = [payload[start + i] if start + i < len(payload) else 0 for i in range(FIXTURE_CHANNELS)]
        self.controller.update_dmx(channels, addr[0])

    def send_poll_reply(self, addr):
        """ArtPollReply so consoles can discover this node."""
        ip = local_ip_for(addr[0])
        u = self.universe
        pkt = bytearray(239)
        pkt[0:8] = ARTNET_ID
        struct.pack_into("<H", pkt, 8, OP_POLL_REPLY)
        pkt[10:14] = socket.inet_aton(ip)
        struct.pack_into("<H", pkt, 14, ARTNET_PORT)
        pkt[16], pkt[17] = 0, 1  # firmware version
        pkt[18] = (u >> 8) & 0x7F  # NetSwitch
        pkt[19] = (u >> 4) & 0x0F  # SubSwitch
        pkt[20], pkt[21] = 0x00, 0xFF  # OEM unknown
        pkt[23] = 0xD0  # Status1: indicators normal, addresses set from front panel
        short = self.cfg["node_name"].encode("ascii", "replace")[:17]
        long_ = ("%s (FGC 2026 Art-Net -> WLED)" % self.cfg["node_name"]).encode("ascii", "replace")[:63]
        pkt[26 : 26 + len(short)] = short
        pkt[44 : 44 + len(long_)] = long_
        self.poll_replies += 1
        report = ("#0001 [%04d] OK" % (self.poll_replies % 10000)).encode("ascii")
        pkt[108 : 108 + len(report)] = report
        struct.pack_into(">H", pkt, 172, 1)  # NumPorts
        pkt[174] = 0x80  # PortTypes[0]: output, DMX512
        pkt[182] = 0x80  # GoodOutput[0]: data being output
        pkt[190] = u & 0x0F  # SwOut[0]
        pkt[200] = 0x00  # Style: StNode
        pkt[207:211] = socket.inet_aton(ip)  # BindIp
        pkt[211] = 1  # BindIndex
        pkt[212] = 0x08  # Status2: supports 15-bit port addresses
        try:
            self.sock.sendto(bytes(pkt), (addr[0], ARTNET_PORT))
        except OSError as e:
            LOG.debug("ArtPollReply to %s failed: %s", addr[0], e)


# =============================================================================
# WLED output (one thread per controller, so one offline device can't stall the others)
# =============================================================================

DNRGB = 4
DNRGB_MAX_LEDS = 489
RESTORE_SEG_KEYS = (
    "id", "on", "bri", "frz", "col", "fx", "sx", "ix", "pal",
    "c1", "c2", "c3", "o1", "o2", "o3", "cct",
)


class WledDevice(threading.Thread):
    def __init__(self, field, host, cfg, controller, stop):
        super().__init__(name="wled-%s" % host, daemon=True)
        self.field = field
        self.host = host
        self.label = "%s/%s" % (field, host) if field else host  # used in logs
        self.cfg = cfg
        self.controller = controller
        self.stop = stop
        self.base_url = "http://%s" % host
        self.ip_host = host.rsplit(":", 1)[0] if host.count(":") == 1 else host
        self.udp_addr = None
        self.udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.timeout = float(cfg["http_timeout_s"])

        self.applied = RELEASE
        self.snapshot = None  # game state saved before an effect took over
        self.last_pixel = None  # last color streamed in RGB mode
        self.fire_cue_done = 0  # id of the last /override/disabledToFire cue handled
        self.fx_ids = {}  # mode -> (effect id, palette id)
        self.led_count = 0
        self.version = None
        self.info_at = 0.0

        self.sent_on = None
        self.sent_bri = None
        self.sent_bri_at = 0.0
        self.fx_checked_at = 0.0

        self.online = False
        self.last_error = None
        self.last_ok = None
        self._warned = set()

    # --- HTTP ----------------------------------------------------------------
    def request(self, path, body=None):
        data = None if body is None else json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            self.base_url + path,
            data=data,
            headers={"Content-Type": "application/json"} if data else {},
            method="GET" if data is None else "POST",
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            raw = resp.read()
        if not self.online:
            LOG.info("%s: online", self.label)
        self.online = True
        self.last_error = None
        self.last_ok = time.time()
        return json.loads(raw.decode("utf-8")) if raw else {}

    def post_state(self, body):
        return self.request("/json/state", body)

    def fade(self):
        """`transition_s` in WLED's units (100 ms) for a one-off `tt` transition."""
        return max(0, min(65535, int(round(float(self.cfg["transition_s"]) * 10))))

    def try_post_state(self, body, what):
        try:
            self.post_state(body)
        except (OSError, ValueError) as e:
            LOG.warning("%s: %s failed (%s); continuing", self.label, what, getattr(e, "reason", None) or e)

    def mark_error(self, err):
        msg = str(getattr(err, "reason", None) or err)
        if self.online or self.last_error is None:
            LOG.warning("%s: unreachable (%s)", self.label, msg)
        self.online = False
        self.last_error = msg
        self.info_at = 0.0  # refresh info once it's back

    # --- device info ---------------------------------------------------------
    def refresh_info(self):
        data = self.request("/json")
        info = data.get("info", {})
        self.led_count = int(info.get("leds", {}).get("count", 0))
        self.version = info.get("ver")
        effects = data.get("effects", [])
        palettes = data.get("palettes", [])
        for mode in FX_MODES:
            c = self.cfg[FX_CONFIG_KEY[mode]]
            fx = self.lookup(effects, c["effect"], int(c["fallback_effect_id"]), "effect")
            pal = self.lookup(palettes, c["palette"], int(c["fallback_palette_id"]), "palette")
            self.fx_ids[mode] = (fx, pal)
        self.udp_addr = (socket.gethostbyname(self.ip_host), int(self.cfg["realtime_port"]))
        self.info_at = time.monotonic()

    def lookup(self, names, wanted, fallback, kind):
        lowered = [str(n).strip().lower() for n in names]
        if str(wanted).strip().lower() in lowered:
            return lowered.index(str(wanted).strip().lower())
        key = (kind, wanted)
        if key not in self._warned:
            self._warned.add(key)
            LOG.warning("%s: %s %r not found, using id %d", self.label, kind, wanted, fallback)
        return fallback

    # --- main loop -----------------------------------------------------------
    def run(self):
        period = 1.0 / float(self.cfg["output_hz"])
        while not self.stop.is_set():
            started = time.monotonic()
            try:
                self.tick(self.controller.desired())
            except (OSError, ValueError) as e:  # URLError/timeouts are OSError; bad JSON is ValueError
                self.mark_error(e)
                self.stop.wait(1.0)
                continue
            except Exception:
                LOG.exception("%s: unexpected error", self.label)
                self.stop.wait(1.0)
                continue
            self.stop.wait(max(0.0, period - (time.monotonic() - started)))

        # Shutdown: give the lights back to the game.
        if self.applied != RELEASE:
            try:
                self.transition(Desired(RELEASE, 0, 0, 0, 0, "shutdown"))
            except Exception as e:
                LOG.warning("%s: could not release on shutdown: %s", self.label, e)
        self.udp.close()

    def tick(self, d):
        now = time.monotonic()
        have_info = self.led_count > 0 and self.udp_addr is not None and len(self.fx_ids) == len(FX_MODES)
        refresh_due = not self.info_at or now - self.info_at > float(self.cfg["info_refresh_s"])
        # RGB is pure UDP. WLED on Wi-Fi answers HTTP slowly while it's being streamed to,
        # so never let a periodic HTTP refresh interrupt the stream.
        streaming = RGB in (d.mode, self.applied)
        if not have_info or (refresh_due and not streaming):
            self.refresh_info()
        cue = self.controller.pending_fire_cue()
        if cue is not None and cue != self.fire_cue_done:
            if d.mode == RELEASE:  # skip it if the console was re-enabled in the meantime
                self.run_fire_cue()
            self.fire_cue_done = cue
            return
        if d.mode != self.applied:
            self.transition(d)
        if d.mode == RGB:
            self.send_rgb(d)
        elif d.mode in FX_MODES:
            self.maintain_fx(d, now)

    def transition(self, d):
        old, new = self.applied, d.mode
        # Leave the old mode. Each step can be retried, so a failure here just
        # gets retried on the next tick.
        if old == RGB and new in FX_MODES and self.last_pixel is not None:
            if self.snapshot is None:
                self.snapshot = self.request("/json/state")
            self.handoff_from_stream(self.snapshot.get("seg") or [{"id": 0}])
        elif old == RGB:
            # Exit realtime now instead of waiting for the timeout. Best-effort:
            # WLED exits on its own `realtime_timeout_s` after the last frame anyway.
            self.try_post_state({"live": False}, "exit realtime")
        elif old in FX_MODES and new not in FX_MODES:
            self.restore_snapshot()
        # Enter the new mode.
        if new == RGB:
            # Make sure live override isn't blocking realtime data. Best-effort, so
            # a slow HTTP reply never delays the stream.
            self.try_post_state({"lor": 0}, "clear live override")
        elif new in FX_MODES:
            if self.snapshot is None:
                self.snapshot = self.request("/json/state")
            self.apply_fx(d)
        self.applied = new
        LOG.info("%s: %s -> %s", self.label, old, new)

    # --- RGB (realtime UDP) --------------------------------------------------
    def send_rgb(self, d):
        if self.led_count <= 0 or self.udp_addr is None:
            return
        pixel = bytes((scale(d.r, d.dim), scale(d.g, d.dim), scale(d.b, d.dim)))
        self.last_pixel = pixel
        timeout = max(1, min(254, int(self.cfg["realtime_timeout_s"])))
        for start in range(0, self.led_count, DNRGB_MAX_LEDS):
            count = min(DNRGB_MAX_LEDS, self.led_count - start)
            header = bytes((DNRGB, timeout, (start >> 8) & 0xFF, start & 0xFF))
            self.udp.sendto(header + pixel * count, self.udp_addr)

    # --- Fire / Rainbow (onboard effects via JSON API) -----------------------
    def handoff_from_stream(self, segs):
        """WLED can't fade out of a realtime stream. Hand off invisibly instead: set the
        underlying state to a solid matching the streamed color, then drop out of realtime
        (no visible change), so the next `tt` change can crossfade from it."""
        self.post_state({
            "tt": 0,
            "seg": [
                {"id": s.get("id", i), "on": True, "frz": False, "fx": 0, "col": [list(self.last_pixel)]}
                for i, s in enumerate(segs)
            ],
        })
        self.try_post_state({"live": False}, "exit realtime")

    def fx_body(self, mode, dim, segs):
        fx, pal = self.fx_ids[mode]
        c = self.cfg[FX_CONFIG_KEY[mode]]
        return {
            "on": dim > 0,
            "bri": max(1, dim),
            "tt": self.fade(),  # one-off transition; "transition" would change the WLED default
            "seg": [
                {
                    "id": s.get("id", i),
                    "on": True,
                    "frz": False,
                    "fx": fx,
                    "pal": pal,
                    "sx": int(c["speed"]),
                    "ix": int(c["intensity"]),
                }
                for i, s in enumerate(segs)
            ],
        }

    def run_fire_cue(self):
        """/override/disabledToFire: fade whatever is showing to Fire once, then let go.
        No snapshot is kept and nothing is re-applied, so the field robots' next commands
        take effect normally."""
        segs = self.request("/json/state").get("seg") or [{"id": 0}]
        if self.applied == RGB and self.last_pixel is not None:
            self.handoff_from_stream(segs)
        self.post_state(self.fx_body(FIRE, int(self.cfg["disabled_fire_intensity"]), segs))
        LOG.info("%s: %s -> FIRE (one-shot; field robots keep control)", self.label, self.applied)
        self.applied = RELEASE
        self.snapshot = None
        self.sent_on = self.sent_bri = None

    def apply_fx(self, d):
        segs = (self.snapshot or {}).get("seg") or [{"id": 0}]
        on, bri = d.dim > 0, max(1, d.dim)
        self.post_state(self.fx_body(d.mode, d.dim, segs))
        now = time.monotonic()
        self.sent_on, self.sent_bri, self.sent_bri_at = on, bri, now
        self.fx_checked_at = now

    def maintain_fx(self, d, now):
        on, bri = d.dim > 0, max(1, d.dim)
        if (on, bri) != (self.sent_on, self.sent_bri) and now - self.sent_bri_at >= 0.1:
            self.post_state({"on": on, "bri": bri, "tt": 0})  # the console fades intensity itself
            self.sent_on, self.sent_bri, self.sent_bri_at = on, bri, now

        if now - self.fx_checked_at >= float(self.cfg["fx_check_s"]):
            self.fx_checked_at = now
            state = self.request("/json/state")
            if self.fx_drifted(state, d):
                LOG.info("%s: game changed the lights during %s; saving its state and restarting the effect", self.label, d.mode)
                self.snapshot = self.merge_snapshot(state, d.mode)
                self.apply_fx(d)

    def fx_drifted(self, state, d):
        fx, pal = self.fx_ids[d.mode]
        if bool(state.get("on")) != self.sent_on:
            return True
        if self.sent_on and state.get("bri") != self.sent_bri:
            return True
        for s in state.get("seg", []):
            if s.get("fx") != fx or s.get("pal") != pal or s.get("frz") or not s.get("on", True):
                return True
        return False

    def merge_snapshot(self, state, mode):
        """The game's new state. Any value that still matches what this proxy set is
        taken from the previous snapshot, so the game's own settings come back on release."""
        new = dict(state)
        old = self.snapshot or {}
        if state.get("on") == self.sent_on and state.get("bri") == self.sent_bri:
            if "on" in old:
                new["on"] = old["on"]
            if "bri" in old:
                new["bri"] = old["bri"]
        fx, pal = self.fx_ids[mode]
        c = self.cfg[FX_CONFIG_KEY[mode]]
        ours = {"on": True, "frz": False, "fx": fx, "pal": pal, "sx": int(c["speed"]), "ix": int(c["intensity"])}
        old_segs = {s.get("id", i): s for i, s in enumerate(old.get("seg", []))}
        segs = []
        for i, s in enumerate(state.get("seg", [])):
            s = dict(s)
            prev = old_segs.get(s.get("id", i), {})
            for key, value in ours.items():
                if s.get(key) == value and key in prev:
                    s[key] = prev[key]
            segs.append(s)
        new["seg"] = segs
        return new

    def restore_snapshot(self):
        snap = self.snapshot
        if snap is None:
            return
        body = {
            "on": snap.get("on", True),
            "bri": snap.get("bri", 255),
            "tt": self.fade(),
            "seg": [{k: s[k] for k in RESTORE_SEG_KEYS if k in s} for s in snap.get("seg", [])],
        }
        self.post_state(body)
        self.snapshot = None
        self.sent_on = self.sent_bri = None

    # --- status --------------------------------------------------------------
    def status(self):
        return {
            "field": self.field,
            "host": self.host,
            "online": self.online,
            "applied_mode": self.applied,
            "led_count": self.led_count,
            "version": self.version,
            "holding_game_snapshot": self.snapshot is not None,
            "last_ok": self.last_ok,
            "last_error": self.last_error,
        }


# =============================================================================
# HTTP API (Companion)
# =============================================================================


class App:
    def __init__(self, cfg, controller, listener, devices):
        self.cfg = cfg
        self.controller = controller
        self.listener = listener
        self.devices = devices

    def controller_summary(self):
        by_field = {}
        for d in self.devices:
            f = by_field.setdefault(d.field or "(ungrouped)", {"total": 0, "online": 0, "offline_hosts": []})
            f["total"] += 1
            if d.online:
                f["online"] += 1
            else:
                f["offline_hosts"].append(d.host)
        return {
            "total": len(self.devices),
            "online": sum(1 for d in self.devices if d.online),
            "by_field": by_field,
        }

    def status(self):
        s = self.controller.summary()
        s.update({
            "controllers": self.controller_summary(),
            "uptime_s": round(time.monotonic() - self.controller.started, 1),
            "artnet": {
                "universe": int(self.cfg["artnet_universe"]),
                "start_address": int(self.cfg["dmx_start_address"]),
                "timeout_s": float(self.cfg["artnet_timeout_s"]),
            },
            "console": self.controller.console_status(),
            "devices": [d.status() for d in self.devices],
        })
        return s


ROUTES_HELP = {
    "/override/enable": "production may take control (alias /override/on)",
    "/override/disable": "lights always follow the game (alias /override/off)",
    "/override/toggle": "flip the override",
    "/override/disabledToFire": "console off, one-shot fade to Fire, then robots keep control (alias /disabledToFire)",
    "/override": "current override + mode",
    "/status": "full status",
    "/health": "liveness",
}


def make_handler(app):
    class Handler(BaseHTTPRequestHandler):
        server_version = "ArtnetWledProxy/1.0"

        def do_GET(self):
            self.route()

        def do_POST(self):
            length = int(self.headers.get("Content-Length") or 0)
            if length:
                self.rfile.read(length)
            self.route()

        def do_OPTIONS(self):
            self.send_response(204)
            self.cors()
            self.end_headers()

        def route(self):
            path = urlparse(self.path).path.rstrip("/") or "/"
            who = "%s %s" % (self.client_address[0], path)
            c = app.controller
            if path in ("/override/enable", "/override/on"):
                self.reply(200, c.set_override(True, who))
            elif path in ("/override/disable", "/override/off"):
                self.reply(200, c.set_override(False, who))
            elif path == "/override/toggle":
                self.reply(200, c.toggle_override(who))
            elif path.lower() in ("/override/disabledtofire", "/disabledtofire"):
                self.reply(200, c.disabled_to_fire(who))
            elif path in ("/override", "/override/status"):
                self.reply(200, c.summary())
            elif path == "/status":
                self.reply(200, app.status())
            elif path == "/health":
                self.reply(200, {"ok": True})
            elif path == "/":
                self.reply(200, {"service": SERVICE_NAME, "routes": ROUTES_HELP})
            else:
                self.reply(404, {"error": "not found", "routes": ROUTES_HELP})

        def cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def reply(self, code, body):
            data = json.dumps(body, indent=2).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.cors()
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, fmt, *args):
            LOG.debug("API %s - %s", self.client_address[0], fmt % args)

    return Handler


# =============================================================================
# Commands
# =============================================================================


def setup_logging(level):
    logging.basicConfig(
        level=getattr(logging, str(level).upper(), logging.INFO),
        format="%(asctime)s %(levelname)-7s %(message)s",
        stream=sys.stdout,
    )


def cmd_run(cfg, cfg_path):
    LOG.info("Starting %s (config: %s)", SERVICE_NAME, cfg_path or "built-in defaults")
    controllers = controller_list(cfg)
    if not controllers:
        LOG.warning("No wled_hosts configured; Art-Net will be received but nothing will be driven")
    else:
        fields = sorted({f for f, _ in controllers if f})
        LOG.info("Driving %d WLED controller(s)%s", len(controllers),
                 " across %d field(s): %s" % (len(fields), ", ".join(fields)) if fields else "")

    stop = threading.Event()
    controller = Controller(cfg)
    listener = ArtNetListener(cfg, controller, stop)
    devices = [WledDevice(f, h, cfg, controller, stop) for f, h in controllers]
    app = App(cfg, controller, listener, devices)

    httpd = ThreadingHTTPServer((cfg["api_bind"], int(cfg["api_port"])), make_handler(app))
    httpd.daemon_threads = True
    api_thread = threading.Thread(target=httpd.serve_forever, name="api", daemon=True)

    def on_signal(signum, _frame):
        LOG.info("Received signal %d", signum)
        stop.set()

    signal.signal(signal.SIGINT, on_signal)
    signal.signal(signal.SIGTERM, on_signal)

    listener.start()
    for d in devices:
        d.start()
    api_thread.start()
    LOG.info("API listening on http://%s:%d (override %s)", cfg["api_bind"], int(cfg["api_port"]),
             "ENABLED" if controller.override else "disabled")

    while not stop.wait(1.0):
        pass

    LOG.info("Shutting down; giving the lights back to the game")
    httpd.shutdown()
    for d in devices:
        d.join(timeout=5)
    listener.join(timeout=2)
    LOG.info("Stopped")
    return 0


def cmd_install_service(cfg_path):
    if os.name != "posix" or os.geteuid() != 0:
        print("install-service must be run as root on the Pi: sudo python3 %s install-service" % sys.argv[0])
        return 1
    config_path = cfg_path or DEFAULT_CONFIG_PATH
    if not os.path.exists(config_path):
        sample = copy.deepcopy(DEFAULT_CONFIG)
        if not sample["wled_hosts"]:  # keep hosts already set in this script
            sample["wled_hosts"] = {
                "Field %d" % n: ["192.168.%d.101" % n, "192.168.%d.102" % n] for n in range(1, 6)
            }
        sample = dict(
            [("_comment", "Replace wled_hosts with the WLED controller IPs (goals + sticks), then: "
                          "sudo systemctl restart %s" % SERVICE_NAME)]
            + list(sample.items())
        )
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(sample, f, indent=2)
            f.write("\n")
        print("Wrote sample config %s (edit wled_hosts!)" % config_path)
    else:
        print("Keeping existing config %s" % config_path)

    user = os.environ.get("SUDO_USER") or "root"
    unit_path = "/etc/systemd/system/%s.service" % SERVICE_NAME
    unit = """[Unit]
Description=Art-Net to WLED production override proxy (FGC 2026)
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User={user}
ExecStart="{python}" "{script}" --config "{config}" run
Restart=always
RestartSec=2
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
""".format(user=user, python=sys.executable, script=os.path.abspath(__file__), config=config_path)
    with open(unit_path, "w", encoding="utf-8") as f:
        f.write(unit)
    print("Wrote %s (runs as %s)" % (unit_path, user))
    subprocess.run(["systemctl", "daemon-reload"], check=True)
    subprocess.run(["systemctl", "enable", "--now", SERVICE_NAME], check=True)
    subprocess.run(["systemctl", "restart", SERVICE_NAME], check=True)
    print("Service enabled and started. Logs: journalctl -u %s -f" % SERVICE_NAME)
    return 0


def cmd_test_send(cfg, args):
    universe = int(cfg["artnet_universe"]) if args.universe is None else args.universe
    start = int(cfg["dmx_start_address"]) if args.address is None else args.address
    frame = bytearray(512)
    channels = [0] * FIXTURE_CHANNELS
    channels[CH_DIM], channels[CH_FEATURE] = args.dim, args.mode
    channels[CH_R], channels[CH_G], channels[CH_B] = args.r, args.g, args.b
    frame[start - 1 : start - 1 + FIXTURE_CHANNELS] = bytes(channels)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    print(
        "Sending Art-Net to %s universe %d @ %d: intensity=%d type=%d (%s) R=%d G=%d B=%d  [Ctrl+C to stop]"
        % (args.host, universe, start, args.dim, args.mode, mode_from_feature(args.mode), args.r, args.g, args.b)
    )
    seq, deadline = 1, (time.monotonic() + args.duration) if args.duration > 0 else None
    try:
        while deadline is None or time.monotonic() < deadline:
            sock.sendto(build_artdmx(universe, frame, seq), (args.host, ARTNET_PORT))
            seq = seq % 255 + 1
            time.sleep(1.0 / 30)
    except KeyboardInterrupt:
        pass
    finally:
        sock.close()
    return 0


def dmx_value(text):
    v = int(text)
    if not 0 <= v <= 255:
        raise argparse.ArgumentTypeError("must be 0-255")
    return v


def main(argv=None):
    parser = argparse.ArgumentParser(description="Art-Net -> WLED production override proxy (FGC 2026)")
    parser.add_argument("--config", help="config JSON (default: %s if it exists)" % DEFAULT_CONFIG_PATH)
    sub = parser.add_subparsers(dest="command")
    sub.add_parser("run", help="run the proxy (default)")
    sub.add_parser("install-service", help="install and start the systemd service (sudo)")
    ts = sub.add_parser("test-send", help="send Art-Net test frames, no console needed")
    ts.add_argument("--host", default="127.0.0.1", help="destination IP (default 127.0.0.1; use x.x.x.255 to broadcast)")
    ts.add_argument("--r", type=dmx_value, default=0)
    ts.add_argument("--g", type=dmx_value, default=0)
    ts.add_argument("--b", type=dmx_value, default=0)
    ts.add_argument("--mode", type=dmx_value, default=50, help="ch2 type select (0 normal, 50 RGB, 100 rainbow, 200 fire)")
    ts.add_argument("--dim", type=dmx_value, default=255, help="ch1 intensity")
    ts.add_argument("--universe", type=int, help="override config universe")
    ts.add_argument("--address", type=int, help="override config start address")
    ts.add_argument("--duration", type=float, default=0, help="seconds to send (0 = until Ctrl+C)")
    args = parser.parse_args(argv)

    if args.command == "install-service":
        return cmd_install_service(args.config)

    cfg, cfg_path = load_config(args.config)
    setup_logging(cfg["log_level"])
    if args.command == "test-send":
        return cmd_test_send(cfg, args)
    return cmd_run(cfg, cfg_path)


if __name__ == "__main__":
    sys.exit(main())
