import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const dossier = mkdtempSync(join(tmpdir(),'begpharma-redemarrage-'));
let serveur;
async function demarrer() {
  serveur = spawn(process.execPath,['mock-backend.mjs'],{env:{...process.env,PORT:'8109',BEGPHARMA_DEMO_STATE:join(dossier,'session.json')},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject) => {
    const t=setTimeout(() => reject(Error('Démarrage du simulateur impossible')),10000);
    serveur.once('exit',code => {clearTimeout(t);reject(Error('Arrêt prématuré '+code));});
    serveur.stdout.once('data',()=>{clearTimeout(t);resolve();});
  });
}
async function arreter() { if(serveur && serveur.exitCode===null){const fin=once(serveur,'exit');serveur.kill();await fin;} }
async function api(path,token,body) {
  const r=await fetch('http://127.0.0.1:8109/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  assert.ok(r.ok, path+': '+r.status);return r.json();
}
try {
  await demarrer();
  const compte=await api('/auth/register',null,{name:'Recette isolée',email:'recette@example.test',password:'Recette2026!'});
  const officine=await api('/officines',compte.token,{nom:'Recette isolée',ville:'Porto-Novo'});
  const base='/officines/'+officine.id;
  const catalogue=await api(base+'/canevas',compte.token);
  await api(base+'/canevas/'+catalogue[0].id+'/documents',compte.token,{valeurs:{},processus:'QAM',type_doc:'procedure'});
  await arreter();await demarrer();
  const profil=await api('/auth/me',compte.token);
  assert.equal(profil.user.id,compte.user.id);assert.equal(profil.officines[0].id,officine.id);
  assert.equal((await api(base+'/canevas',compte.token)).length,62);
  assert.equal((await api(base+'/documents',compte.token)).length,1);
  console.log('Redémarrage vérifié : connexion, officine, modèles et brouillon conservés.');
} finally {await arreter();rmSync(dossier,{recursive:true,force:true});}
