import { z } from 'zod';
import { commonParamsSchema, type Json } from './types.js';
const keys: Record<string, (keyof typeof commonParamsSchema.shape)[]> = {};
const use = (
  ids: string,
  ...params: (keyof typeof commonParamsSchema.shape)[]
) => {
  for (const id of ids.split(' ')) keys[id] = [...(keys[id] ?? []), ...params];
};
use('A8', 'lambda');
use('A19 K13', 'samples', 'seed');
use('A38', 'opponentTeamKey');
use('A39', 'metric');
use('A40 I2', 'window');
use('A42', 'partnerTeamKey', 'replacementTeamKey', 'alliance');
use(
  'B1 B10 B13 B14 B15 B18 B20 C2 C3 C9 C14 C15 D1 D2 D5 D6 D7 E7 E8 E12 F1 F2 F3 F4 F15 F16 F17 G1 G2 G3 H1 H2 H4 H6 H7 H8 H13 H14 L7 M3 M4 M7 M24',
  'alliance'
);
use('B11 H1 H2 M20', 'windowSeconds');
use('F8 F9', 'bins');
use('J7', 'countries');
use('L7', 'balls');
use('M15', 'atUtc');
export function paramsFor(id: string): z.ZodType<Record<string, Json>> {
  const shape: Record<string, z.ZodType> = {};
  for (const key of keys[id] ?? []) shape[key] = commonParamsSchema.shape[key];
  if (id === 'M15') shape.atUtc = z.iso.datetime({ offset: true });
  if (id === 'A38') shape.opponentTeamKey = z.number().int().positive();
  if (id === 'A42') {
    shape.partnerTeamKey = z.number().int().positive();
    shape.replacementTeamKey = z.number().int().positive();
  }
  if (id === 'J7')
    shape.countries = z
      .array(z.string().min(1))
      .length(2)
      .refine((c) => c[0] !== c[1], 'Two distinct countries are required');
  return z.object(shape).strict() as z.ZodType<Record<string, Json>>;
}
export function fixtureParams(id: string) {
  const candidates: Record<string, Json> = {
    atUtc: '2026-09-01T12:02:00.000Z',
    opponentTeamKey: 5,
    partnerTeamKey: 2,
    replacementTeamKey: 8,
    countries: ['United States', 'Canada']
  };
  return paramsFor(id).parse(
    Object.fromEntries(
      (keys[id] ?? []).flatMap((key) =>
        key in candidates ? [[key, candidates[key]]] : []
      )
    )
  );
}
