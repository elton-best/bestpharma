import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { lireEtatDemo, ecrireEtatDemo } from '../mock-data/persistance-demo.mjs';
const d = mkdtempSync(join(tmpdir(),'begpharma-demo-')); const f = join(d,'prive','session.json');
try {
  assert.equal(lireEtatDemo(f), null);
  const etat = {version:1,utilisateurs:[{id:'recette',passwordHash:'empreinte-de-recette'}],officines:[{id:'o-recette'}],documents:[{id:'d-recette'}]};
  ecrireEtatDemo(f, etat); assert.deepEqual(lireEtatDemo(f), etat);
  assert.equal(statSync(f).mode & 0o777, 0o600);
  writeFileSync(f,'illisible'); assert.throws(() => lireEtatDemo(f));
  console.log('Persistance de démonstration : relecture, permissions et refus d’une réinitialisation silencieuse vérifiés.');
} finally { rmSync(d,{recursive:true,force:true}); }
