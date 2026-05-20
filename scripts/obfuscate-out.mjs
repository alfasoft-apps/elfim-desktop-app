/**
 * Production bundle üçün javascript-obfuscator — `electron-vite build`-dan sonra işləyir.
 * Vue/Electron üçün aqressiv seçimlər (controlFlowFlattening və s.) sönük saxlanılıb.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import JavaScriptObfuscator from 'javascript-obfuscator';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const outDir = join(rootDir, 'out');

/** javascript-obfuscator parametrləri — daha aqressiv etmək bug və yükləmə riskini artırır */
const options = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  stringArray: true,
  stringArrayCallsTransform: false,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 0.75,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
};

function walkJs(dir) {
  /** @type {string[]} */
  const files = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) files.push(...walkJs(p));
    else if (ent.isFile() && /\.(js|mjs)$/i.test(ent.name)) files.push(p);
  }
  return files;
}

function main() {
  const files = walkJs(outDir);
  if (files.length === 0) {
    console.warn('[obfuscate-out] out/ içində .js/.mjs tapılmadı — əvvəl npm run build (electron-vite build) işlədin.');
    process.exit(0);
  }
  let n = 0;
  for (const abs of files) {
    const src = readFileSync(abs, 'utf8');
    const result = JavaScriptObfuscator.obfuscate(src, options);
    writeFileSync(abs, result.getObfuscatedCode(), 'utf8');
    console.log('[obfuscate-out]', relative(rootDir, abs));
    n++;
  }
  console.log(`[obfuscate-out] Hazır — ${n} fayl.`);
}

main();
