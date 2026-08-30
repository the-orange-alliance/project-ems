// Generates one static JSON file per country code under public/flags/base64/,
// each containing the square (1x1) and traditional (4x3) flag images as
// base64 strings. These are served as-is by Vite/serve, giving consumers a
// static "endpoint" like GET /flags/base64/us.json (see GH issue #238).
import { readdir, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
const flagsDir = join(publicDir, 'flags');
const outDir = join(flagsDir, 'base64');

const VARIANTS = [
  { key: 'square', dir: join(flagsDir, '1x1') },
  { key: 'traditional', dir: join(flagsDir, '4x3') }
];

// Only plain lowercase-alphanumeric codes are real country codes; filenames
// like "cr_old.svg" or "sy_old.svg" are historical/alternate variants and
// aren't addressable by country code.
const isCountryCode = (code) => /^[a-z0-9]+$/.test(code);

async function listCodes(dir) {
  const entries = await readdir(dir);
  const codes = new Set();
  for (const entry of entries) {
    const code = basename(entry, extname(entry));
    if (isCountryCode(code)) codes.add(code);
  }
  return codes;
}

async function readVariant(dir, code) {
  for (const format of ['svg', 'jpg']) {
    try {
      const data = await readFile(join(dir, `${code}.${format}`));
      return { data: data.toString('base64'), format };
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
  return null;
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const codeSets = await Promise.all(VARIANTS.map((v) => listCodes(v.dir)));
  const allCodes = [...new Set(codeSets.flatMap((s) => [...s]))].sort();

  for (const code of allCodes) {
    const result = { countryCode: code };
    for (const variant of VARIANTS) {
      result[variant.key] = await readVariant(variant.dir, code);
    }
    await writeFile(join(outDir, `${code}.json`), JSON.stringify(result));
  }

  console.log(
    `[generate-flag-data] wrote ${allCodes.length} flag file(s) to ${outDir}`
  );
}

main().catch((err) => {
  console.error('[generate-flag-data] failed:', err);
  process.exit(1);
});
