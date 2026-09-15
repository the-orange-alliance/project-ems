// Run from repository root after building every workspace. Uses isolated fixture data.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createServer as createTcpServer, connect as tcpConnect } from 'node:net';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, basename, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { AsyncDatabase } from 'promised-sqlite3';
import { io } from 'socket.io-client';
import { definitions } from '@toa-lib/models/seasons/stats';

process.env.NO_PROXY = '127.0.0.1,localhost';
process.env.no_proxy = '127.0.0.1,localhost';
process.env.NODE_USE_ENV_PROXY = '0';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const apiDirectory = join(root, 'apps/services/api');
const evidence = join(root, 'temp/stats-production/fixtures');
const scratch = await mkdtemp(join(tmpdir(), 'ems-graphics-system-'));
const children = [], sockets = [], sessions = [], checks = [];
// The built web bundle derives its API and realtime origins from its own hostname
// with the fixed production ports 8080/8081, so the browser leg has to see those
// exact ports. Rather than demand the operator free them, the services bind high
// ports on 127.0.0.1 and the page is served from a separate loopback address whose
// 8080/8081 are forwarded to them. A specific-address bind wins over any wildcard
// listener an editor, tunnel or dev server already holds, so nothing is displaced.
const PORT = {
  api: Number(process.env.EMS_SMOKE_API_PORT ?? 18080),
  realtime: Number(process.env.EMS_SMOKE_REALTIME_PORT ?? 18081),
  web: Number(process.env.EMS_SMOKE_WEB_PORT ?? 14178),
  disabled: Number(process.env.EMS_SMOKE_DISABLED_PORT ?? 18082)
};
// Production ports, as the built bundle expects to find them.
const WEB_API_PORT = 8080, WEB_REALTIME_PORT = 8081;
const browserHost = process.env.EMS_SMOKE_BROWSER_HOST ?? '127.0.0.2';
const apiBase = `http://127.0.0.1:${PORT.api}`;
const realtimeBase = `http://127.0.0.1:${PORT.realtime}`;
const webBase = `http://${browserHost}:${PORT.web}`;
const disabledBase = `http://127.0.0.1:${PORT.disabled}`;
const forwarders = [];
// Transparent TCP forward; carries both HTTP and the realtime WebSocket upgrade.
function forward(listenHost, listenPort, targetPort) {
  const server = createTcpServer(incoming => {
    const upstream = tcpConnect(targetPort, '127.0.0.1');
    incoming.on('error', () => upstream.destroy());
    upstream.on('error', () => incoming.destroy());
    incoming.pipe(upstream).pipe(incoming);
  });
  forwarders.push(server);
  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen({ port: listenPort, host: listenHost, exclusive: true }, done);
  });
}

let staticServer, fixture;
const pause = ms => new Promise(resolvePause => setTimeout(resolvePause, ms));
async function until(predicate, description, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() >= deadline) throw new Error('Timed out: ' + description);
    await pause(100);
  }
}
// Browsers re-spawn themselves into a process tree; killing only the launcher
// leaves children holding the profile directory open, which makes the cleanup
// `rm` crawl for minutes and hides whatever actually failed. Kill the tree.
function killTree({ child, name }) {
  try {
    if (process.platform === 'win32' && child.pid) {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else child.kill();
  } catch { try { child.kill('SIGKILL'); } catch { /* already gone */ } }
}
function launch(name, args, env, cwd = root) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  children.push({ child, name, output: () => output });
  return child;
}
async function json(path, method = 'GET', payload, port = PORT.api) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method, headers: { 'content-type': 'application/json' },
    ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(30000)
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  return body;
}
async function cdp(url) {
  const socket = new WebSocket(url), pending = new Map();
  let nextId = 0;
  await new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error('CDP connect timeout: ' + url)), 30000);
    socket.addEventListener('open', () => { clearTimeout(timer); done(); }, { once: true });
    socket.addEventListener('error', error => { clearTimeout(timer); fail(error); }, { once: true });
  });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data), request = pending.get(message.id);
    if (request) { pending.delete(message.id); message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result); }
  });
  const session = {
    socket,
    send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolveResult, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 30000);
        pending.set(id, { resolve: value => { clearTimeout(timer); resolveResult(value); }, reject: error => { clearTimeout(timer); reject(error); } });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    async text() { return (await this.send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true })).result.value; }
  };
  sessions.push(session);
  return session;
}
try {
  // Refuse to touch existing listeners; this check opens no production data.
  // Windows permits a 127.0.0.1 bind alongside an existing 0.0.0.0 listener, so probe
  // the wildcard address exclusively and confirm nothing already answers on the port.
  for (const [name, port] of Object.entries(PORT)) {
    const probe = createServer();
    probe.on('error', () => {});
    try {
      await new Promise((done, fail) => { probe.once('error', fail); probe.listen({ port, host: '0.0.0.0', exclusive: true }, done); });
    } catch (error) {
      throw new Error(`Port ${port} (${name}) is already in use by another process (${error.code}). ` +
        'Free it or override with EMS_SMOKE_API_PORT / EMS_SMOKE_REALTIME_PORT / EMS_SMOKE_WEB_PORT / EMS_SMOKE_DISABLED_PORT.');
    }
    await new Promise(done => probe.close(done));
    let occupied = false;
    try { await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) }); occupied = true; } catch { occupied = false; }
    if (occupied) throw new Error(`Port ${port} (${name}) still answers HTTP after the bind probe; another server owns it.`);
  }
  process.chdir(apiDirectory);
  const support = await import(pathToFileURL(join(apiDirectory, 'build/tests/stats-test-support.js')).href);
  fixture = await support.eventFixture();
  const databaseRoot = join(scratch, 'ems');
  await mkdir(databaseRoot);
  const global = await AsyncDatabase.open(join(databaseRoot, 'global.db'));
  await global.exec(await readFile(join(apiDirectory, 'sql/create_global.sql'), 'utf8'));
  for (const eventKey of ['smoke-a', 'smoke-b']) {
    await global.run('INSERT INTO event(eventKey,seasonKey,regionKey,eventTypeKey,eventName) VALUES(?,?,?,?,?)', [eventKey, 'fgc_2026', 'FGC', 'FGC', eventKey]);
    const target = join(databaseRoot, eventKey + '.db');
    await fixture.db.exec("VACUUM INTO '" + target.replaceAll("'", "''") + "'");
    const db = await AsyncDatabase.open(target);
    for (const table of await db.all("SELECT name FROM sqlite_master WHERE type='table'")) {
      const identifier = '"' + table.name.replaceAll('"', '""') + '"';
      const columns = await db.all('PRAGMA table_info(' + identifier + ')');
      if (columns.some(column => column.name === 'eventKey')) await db.run('UPDATE ' + identifier + ' SET eventKey=?', [eventKey]);
    }
    await db.close();
  }
  await global.close();
  await fixture.close(); fixture = null;
  const env = { APPDATA: scratch, WORKDIR: scratch, NODE_ENV: 'development', BACKUP_BUCKET_NAME: '', AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '', JWT_SECRET: 'smoke-only-secret', GRAPHICS_PUBLICATION_TOKEN: 'smoke-only-publication', GRAPHICS_API_BASE_URL: apiBase, GRAPHICS_REALTIME_BASE_URL: realtimeBase, DISABLE_GRAPHICS: 'false', STATS_WORKERS: '1' };
  launch('realtime', ['build/Server.js'], { ...env, SERVICE_PORT: String(PORT.realtime), SERVICE_NAME: 'realtime' }, join(root, 'apps/services/realtime'));
  launch('api', ['build/Server.js'], { ...env, SERVICE_PORT: String(PORT.api), SERVICE_NAME: 'api' }, apiDirectory);
  await until(async () => { try { return (await json('/heartbeat')).online; } catch (error) { console.log('API readiness:', error.message); return false; } }, 'API startup');
  checks.push('real API/realtime startup with isolated two-event databases');
  assert.deepEqual(await json('/auth/login', 'POST', { username: 'smoke', password: 'smoke' }), { ok: true });
  const invalidLogin = await fetch(apiBase + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(invalidLogin.status, 400);
  checks.push('existing login bypass response and malformed login rejection; auth unchanged');

  const received = new Map(), allEvents = [];
  for (const eventKey of ['smoke-a', 'smoke-b']) {
    const socket = io(realtimeBase, { transports: ['websocket'], forceNew: true });
    sockets.push(socket);
    socket.onAny(event => allEvents.push(event));
    socket.on('graphics:playback-state:v1', envelope => { assert.equal(envelope.eventKey, eventKey); received.set(eventKey, envelope); });
    socket.on('connect', () => { socket.emit('rooms', ['graphics']); socket.emit('graphics:subscribe', { eventKey }); });
  }
  await until(() => received.size === 2, 'two event subscriptions');
  const definition = definitions.find(entry => entry.catalogueId === 'B21');
  const spec = id => ({ id, title: id, stat: definition.slug, selectors: {}, filters: {}, params: {}, options: {}, kind: 'stat-tile', mode: 'fullscreen' });
  const command = (event, path, payload = {}) => json(`/graphics/${event}/live/${path}`, 'POST', { requestId: `smoke-${path.replaceAll('/', '-')}-${Date.now()}`, ...payload });
  for (const event of ['smoke-a', 'smoke-b']) {
    const created = await json(`/graphics/${event}/timelines`, 'POST', { timelineId: 'smoke-show', name: 'Smoke Show', items: [spec(event + '-program'), spec(event + '-next')] });
    assert.ok(created.timelineId);
    const loaded = await command(event, 'load/smoke-show');
    assert.equal(loaded.state.cue.status, 'ready');
    const taken = await command(event, 'take');
    await until(() => received.get(event)?.state.revision === taken.state.revision, 'commit publication');
    assert.equal(received.get(event).state.program.graphic.spec.id, event + '-program');
  }
  checks.push('real worker preparation, load/take publication and event isolation');
  const refreshed = await command('smoke-a', 'refresh/program');
  assert.equal(refreshed.state.stagedUpdate.status, 'ready');
  const pushed = await command('smoke-a', 'push-update');
  assert.equal(pushed.state.stagedUpdate.status, 'empty');
  const fresh = await json('/stats/smoke-a/query', 'POST', { stat: definition.slug, refresh: true });
  const cached = await json('/stats/smoke-a/query', 'POST', { stat: definition.slug });
  assert.equal(fresh.result.data, 3668);
  assert.equal(cached.cache, 'fresh');
  checks.push('refresh stages, push promotes, real B21 total 3668 and fresh cache hit');

  // Give the browser the production 8080/8081 on its own loopback address.
  await forward(browserHost, WEB_API_PORT, PORT.api);
  await forward(browserHost, WEB_REALTIME_PORT, PORT.realtime);
  staticServer = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let file = resolve(root, 'apps/web/build', '.' + pathname);
    if (!file.startsWith(resolve(root, 'apps/web/build') + sep)) file = join(root, 'apps/web/build/index.html');
    let contents;
    try { contents = await readFile(file); } catch { file = join(root, 'apps/web/build/index.html'); contents = await readFile(file); }
    response.setHeader('content-type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html');
    response.end(contents);
  });
  await new Promise(done => staticServer.listen(PORT.web, browserHost, done));
  const browserPath = process.env.EMS_LAYOUT_BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const profile = join(scratch, 'browser');
  const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--remote-allow-origins=*', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  children.push({ child: browser, name: 'browser', output: () => '' });
  let debugPort;
  await until(async () => { try { debugPort = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); return Boolean(debugPort); } catch { return false; } }, 'headless browser startup');
  const debugBase = `http://127.0.0.1:${debugPort}`;
  const displays = new Map();
  for (const event of ['smoke-a', 'smoke-b']) {
    for (const [pin, title] of [['STATS', event + '-program'], ['STATS_PREVIEW', event + '-next']]) {
      // Actual enum strings are supplied by the model, avoiding hardcoded route IDs.
      const { AudienceScreens } = await import('@toa-lib/models');
      const url = `${webBase}/${event}/audience?pin=${AudienceScreens[pin]}`;
      const target = await (await fetch(debugBase + '/json/new?' + encodeURIComponent(url), { method: 'PUT' })).json();
      const session = await cdp(target.webSocketDebuggerUrl);
      try {
        await until(async () => (await session.text())?.includes(title), 'built web ' + event + '/' + pin, 60000);
      } catch (error) {
        // A blank or wrong screen is the whole finding; print it rather than only the timeout.
        console.error(`--- ${event}/${pin} expected "${title}"; page showed ---
${await session.text()}
--- end ---`);
        throw error;
      }
      const text = await session.text();
      assert.ok(!text.includes(event === 'smoke-a' ? 'smoke-b-program' : 'smoke-a-program'));
      displays.set(event + '/' + pin, session);
    }
  }
  checks.push('built web PGM/PVW render correct program/next for both events in real Edge');
  const producerTarget = await (await fetch(debugBase + '/json/new?' + encodeURIComponent(webBase + '/smoke-a/graphics'), { method: 'PUT' })).json();
  const producer = await cdp(producerTarget.webSocketDebuggerUrl);
  await until(async () => (await producer.text())?.includes('Smoke Show'), 'producer loaded snapshot/monitor');
  checks.push('built web producer loads authoritative show/monitor');
  // Disconnect/reconnect the external reader; subscribe must hydrate exact state.
  sockets[0].disconnect(); received.delete('smoke-a'); sockets[0].connect();
  await until(() => received.get('smoke-a')?.state.program?.graphic.spec.id === 'smoke-a-program', 'reconnect hydration');
  const quick = await command('smoke-a', 'quick-take', { spec: spec('smoke-a-quick') });
  assert.equal(quick.state.program.graphic.spec.id, 'smoke-a-quick');
  await until(async () => (await displays.get('smoke-a/STATS').text())?.includes('smoke-a-quick'), 'live built-web update');
  await command('smoke-a', 'clear');
  await until(async () => !(await displays.get('smoke-a/STATS').text())?.includes('smoke-a-quick'), 'PGM clear exit');
  assert.ok((await displays.get('smoke-b/STATS').text()).includes('smoke-b-program'));
  checks.push('reconnect hydration, live Quick Take, timed Clear exit, unaffected second event');
  for (const path of ['/graphics/smoke-a/live/take', '/graphics/smoke-a/queue/next', '/graphics/smoke-a/queue/go/0']) {
    assert.equal((await fetch(realtimeBase + path, { method: 'POST' })).status, 404);
  }
  assert.ok(!allEvents.includes('graphics:state'));
  checks.push('removed realtime command/queue aliases return 404; no dual state publication');
  const disabled = launch('disabled-realtime', ['build/Server.js'], { ...env, SERVICE_PORT: String(PORT.disabled), DISABLE_GRAPHICS: 'true' }, join(root, 'apps/services/realtime'));
  await until(async () => { try { return (await fetch(disabledBase + '/graphics/smoke-a/live/state/v1')).status === 404; } catch { return false; } }, 'disabled subfield');
  assert.equal((await fetch(disabledBase + '/internal/graphics/playback', { method: 'POST' })).status, 404);
  checks.push('disabled subfield exposes neither graphics hydration nor publication ingress');
  const version = await json('/heartbeat');
  await writeFile(join(evidence, 'task16-smoke-result.json'), JSON.stringify({ node: process.version, apiVersion: version.version, checks, passed: checks.length, failures: 0 }, null, 2) + '\n');
  console.log(`${checks.length} full-system smoke checks passed`);
} finally {
  for (const socket of sockets) socket.disconnect();
  for (const session of sessions) session.socket.close();
  for (const server of forwarders) { server.close(); server.unref?.(); }
  if (staticServer) {
    // Browser keep-alive sockets otherwise keep close() pending forever.
    staticServer.closeAllConnections?.();
    await new Promise(done => staticServer.close(() => done()));
  }
  for (const entry of children.reverse()) {
    killTree(entry);
    await writeFile(join(evidence, 'task16-smoke-' + entry.name + '.log'), entry.output());
  }
  if (fixture) await fixture.close();
  // Keep only this run's diagnostics; verify absolute ownership before recursive cleanup.
  if (!resolve(scratch).startsWith(resolve(tmpdir()) + sep) || !basename(scratch).startsWith('ems-graphics-system-')) throw new Error('Unsafe smoke cleanup path');
  await pause(3000);
  // Cleanup must never outlive or mask the result it is reporting on.
  try {
    await Promise.race([
      rm(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }),
      pause(30000).then(() => { throw new Error('cleanup timeout'); })
    ]);
  } catch (error) {
    console.warn(`Smoke scratch directory left behind at ${scratch} (${error.message}); remove it manually.`);
  }
}
