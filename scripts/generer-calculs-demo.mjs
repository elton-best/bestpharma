import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const ts = require('typescript');
const source = readFileSync(new URL('../frontend/src/lib/calculs-canevas.ts', import.meta.url), 'utf8');
const sortie = new URL('../mock-data/calculs-canevas.mjs', import.meta.url);
const texte = '// Généré depuis frontend/src/lib/calculs-canevas.ts ; aucune évaluation de code des classeurs.\n'+ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
if (process.argv.includes('--check')) {
  if (readFileSync(sortie,'utf8') !== texte) throw new Error('Recréer le module de démonstration avec node scripts/generer-calculs-demo.mjs');
} else writeFileSync(sortie, texte);
