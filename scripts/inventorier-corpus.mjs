#!/usr/bin/env node
// Inventaire de fichiers uniquement : aucun contenu nominatif n'est extrait.
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const source = path.join(root, '0000. DIGIT ABMEB');
const fichiers = [];
async function parcourir(dossier) {
  for (const entree of await readdir(dossier, { withFileTypes: true })) {
    const absolu = path.join(dossier, entree.name);
    if (entree.isDirectory()) await parcourir(absolu);
    else if (entree.isFile()) {
      const contenu = await readFile(absolu);
      fichiers.push({ chemin: path.relative(source, absolu).split(path.sep).join('/'),
        extension: path.extname(absolu).toLowerCase(), octets: (await stat(absolu)).size,
        sha256: createHash('sha256').update(contenu).digest('hex') });
    }
  }
}
await parcourir(source);
fichiers.sort((a, b) => a.chemin.localeCompare(b.chemin, 'fr'));
const groupes = Map.groupBy(fichiers, f => f.sha256);
const rapport = {
  source: '0000. DIGIT ABMEB',
  avertissement: 'Inventaire technique, pas une validation BPD ni une réconciliation avec les lignes du classeur documentaire. Empreintes calculées au moment de l’inventaire, sans preuve d’antériorité.',
  total_fichiers: fichiers.length,
  par_extension: Object.fromEntries([...Map.groupBy(fichiers, f => f.extension)].map(([ext, fs]) => [ext, fs.length])),
  doublons_identiques: [...groupes.values()].filter(fs => fs.length > 1).map(fs => fs.map(f => f.chemin)),
  fichiers,
};
await mkdir(path.join(root, 'docs'), { recursive: true });
await writeFile(path.join(root, 'docs/inventaire-corpus.json'), JSON.stringify(rapport, null, 2) + '\n');
console.log(`${fichiers.length} fichiers inventoriés. Rapport : docs/inventaire-corpus.json`);
