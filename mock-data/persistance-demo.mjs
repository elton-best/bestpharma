import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export function lireEtatDemo(fichier) {
  let texte;
  try { texte = readFileSync(fichier, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  const etat = JSON.parse(texte);
  if (etat.version !== 1 || !['utilisateurs','officines','documents'].every(k => Array.isArray(etat[k]))) throw new Error('État de démonstration illisible : restauration nécessaire, aucune réinitialisation automatique.');
  return etat;
}
export function ecrireEtatDemo(fichier, etat) {
  mkdirSync(dirname(fichier), {recursive:true, mode:0o700});
  const temporaire = fichier+'.tmp';
  writeFileSync(temporaire, JSON.stringify({version:1,...etat}), {mode:0o600});
  renameSync(temporaire, fichier);
}
