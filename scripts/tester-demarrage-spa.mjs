// Exécuter après la compilation : la navigation ne doit pas demander un rendu SSR
// de la session conservée dans le navigateur.
import assert from 'node:assert/strict';
import handler from '../frontend/dist/server/server.js';
for (const path of ['/app', '/auth', '/documents', '/modeles', '/non-conformites', '/auto-evaluation']) {
  const response = await handler.fetch(new Request('http://recette.local' + path), {}, {});
  const html = await response.text();
  assert.equal(response.status, 200, path);
  assert.ok(!html.includes('Reprise de session en cours'), path);
  assert.ok(html.includes('type="module"'), 'Chargement du client absent : ' + path);
  console.log('✓ Démarrage côté navigateur : ' + path);
}
