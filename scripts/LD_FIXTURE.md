# Field LEDs: 5-ch fixture

**Art-Net → 2.0.0.98 (or broadcast) · Universe 23 · Address 1** (one fixture drives every field)

*Universe 23 is the Art-Net number. A desk that counts universes from 1 may show it as 24.*

**Eos:** import `Essium@FGC_Field_LEDs@v1.gdtf` (GDTF, Eos 3.1+). If it doesn't import, build a 5-ch custom fixture: Intensity, Effect/Mode, Red, Green, Blue.

| Ch | Function |
|---|---|
| 1 | Intensity |
| 2 | Mode: **0–9 Field control** · 10–84 RGB · 85–169 Rainbow · **170–255 Fire** |
| 3–5 | R / G / B (RGB mode only) |

## Bare bones: Fire
1. Ch 2 → **255** (Fire)
2. Ch 1 → intensity as needed

## ⚠️ When you're done: Ch 2 → **0**
That hands the lights back to the field robots. If you leave it in another mode, the fields can't show scores or match states.

*Nothing happens until production enables the override in Companion.*
