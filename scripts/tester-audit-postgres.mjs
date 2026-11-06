#!/usr/bin/env node
// Crée une base temporaire dédiée et la supprime en fin de test. Ne modifie aucune base métier.
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const adminUrl = process.env.AUDIT_TEST_ADMIN_URL;
if (!adminUrl) throw new Error('Définir AUDIT_TEST_ADMIN_URL vers un PostgreSQL de recette avec droit CREATE DATABASE.');
const admin = new pg.Client({ connectionString: adminUrl });
const db = `audit_recette_${randomUUID().replaceAll('-', '')}`;
let client;
let cree = false;
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${db}"`);
  cree = true;
  const url = new URL(adminUrl); url.pathname = `/${db}`;
  client = new pg.Client({ connectionString: url.toString() }); await client.connect();
  await client.query(`CREATE TABLE public.audit_logs (
    id bigserial PRIMARY KEY, officine_id uuid, table_name varchar(100), record_id varchar(255), action varchar(20),
    user_id uuid, user_email varchar(255), old_data jsonb, new_data jsonb, ip_address varchar(45),
    user_agent text, device_id varchar(100), server_timestamp timestamp DEFAULT now()
  );
  CREATE FUNCTION public.prevent_audit_tampering() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN RAISE EXCEPTION 'Journal append-only'; END; $$;
  CREATE TRIGGER trg_audit_logs_tamper_defense BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_tampering();`);
  const migration = readFileSync(new URL('../backend/database/migrations/2026_11_06_150000_chain_audit_logs.php', import.meta.url), 'utf8');
  await client.query(migration.match(/DB::unprepared\(<<<'SQL'\n([\s\S]*?)\n        SQL\);/)[1]);
  const service = readFileSync(new URL('../backend/app/Services/VerificationAuditService.php', import.meta.url), 'utf8');
  let verification = service.match(/DB::selectOne\(<<<'SQL'\n([\s\S]*?)\n            SQL,/)[1];
  let index = 0; verification = verification.replaceAll('?', () => `$${++index}`);
  const verifier = async id => (await client.query(verification, [id, id])).rows[0];
  const inserer = async (id, c = client) => (await c.query(`INSERT INTO public.audit_logs
    (officine_id, table_name, record_id, action, new_data) VALUES ($1, 'documents', $2, 'INSERT', '{"titre":"Recette technique, pas une donnée officinale"}') RETURNING id`, [id, randomUUID()])).rows[0].id;
  const a = randomUUID(), b = randomUUID();
  assert.equal((await verifier(a)).verifiees, '0');
  console.log('✓ Journal vide : aucune preuve inventée');
  const premier = await inserer(a); await inserer(b); await inserer(a);
  let bilan = await verifier(a);
  assert.equal(bilan.verifiees, '2'); assert.equal(bilan.premiere_rupture, null);
  console.log('✓ Empreintes et isolation des officines');
  await Promise.all(Array.from({ length: 8 }, async () => {
    const c = new pg.Client({ connectionString: url.toString() }); await c.connect();
    try { await inserer(a, c); } finally { await c.end(); }
  }));
  bilan = await verifier(a);
  assert.equal(bilan.verifiees, '10'); assert.equal(bilan.premiere_rupture, null);
  console.log('✓ Ajouts concurrents : séquence continue et liens corrects');
  for (const sql of [`UPDATE audit_logs SET action='DELETE' WHERE id=${premier}`, `DELETE FROM audit_logs WHERE id=${premier}`, 'TRUNCATE audit_logs']) {
    await assert.rejects(client.query(sql));
  }
  console.log('✓ UPDATE, DELETE et TRUNCATE bloqués');
  await client.query('ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_tamper_defense');
  await client.query('UPDATE audit_logs SET action=$1 WHERE id=$2', ['DELETE', premier]);
  await client.query('ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_tamper_defense');
  assert.equal(String((await verifier(a)).premiere_rupture), String(premier));
  console.log('✓ Altération administrateur détectée à la première entrée');
  const historique = randomUUID();
  await client.query('ALTER TABLE audit_logs DISABLE TRIGGER trg_chain_audit_insert');
  await inserer(historique);
  await client.query('ALTER TABLE audit_logs ENABLE TRIGGER trg_chain_audit_insert');
  await inserer(historique);
  assert.equal((await verifier(historique)).historiques, '1');
  console.log('✓ Historique non chaîné identifié sans réécriture');
  // Schéma minimal pour exécuter les triggers documentaires réels de la migration.
  // Les tests Laravel restent responsables de la migration complète et des contrôles HTTP.
  await client.query(`CREATE FUNCTION public.user_officines() RETURNS SETOF uuid LANGUAGE sql AS $$ SELECT NULL::uuid WHERE false $$;
    CREATE TABLE documents (id uuid PRIMARY KEY, officine_id uuid, titre text, contenu text, code_document text,
      type_doc text, processus text, version integer, indice_revision integer, statut text);
    CREATE TABLE approbations_documents (id uuid PRIMARY KEY, officine_id uuid, document_id uuid,
      version integer, indice_revision integer, signataire_id uuid, signataire_nom text, role_code text,
      methode text, intention text, contenu_signe text, empreinte_contenu text, approuve_le timestamptz,
      UNIQUE(document_id, version, indice_revision));`);
  const approbations = readFileSync(new URL('../backend/database/migrations/2026_11_06_160000_create_approbations_documents.php', import.meta.url), 'utf8');
  await client.query(approbations.match(/DB::unprepared\(<<<'SQL'\n([\s\S]*?)\n        SQL\);/)[1]);
  const doc = { id: randomUUID(), officine_id: randomUUID(), titre: 'Procédure de recette',
    code_document: 'RECETTE-PR', type_doc: 'procedure', processus: 'QAM', version: 1, indice_revision: 0, contenu: 'Texte de recette éàç' };
  await client.query(`INSERT INTO documents (id, officine_id, titre, code_document, type_doc, processus, version, indice_revision, contenu, statut)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'brouillon')`, Object.values(doc));
  await assert.rejects(client.query("UPDATE documents SET statut='valide' WHERE id=$1", [doc.id]));
  console.log('✓ Approbation sans copie enregistrée refusée par PostgreSQL');
  const copie = JSON.stringify(doc);
  await client.query(`INSERT INTO approbations_documents (id, officine_id, document_id, version, indice_revision,
    signataire_id, signataire_nom, role_code, methode, intention, contenu_signe, empreinte_contenu, approuve_le)
    VALUES ($1,$2,$3,1,0,$4,'Responsable de recette','pharmacien_titulaire','mot_de_passe_compte','approbation_documentaire',
      $5,encode(sha256(convert_to($5,'UTF8')),'hex'),now())`, [randomUUID(), doc.officine_id, doc.id, randomUUID(), copie]);
  await client.query("UPDATE documents SET contenu='Texte changé' WHERE id=$1", [doc.id]);
  await assert.rejects(client.query("UPDATE documents SET statut='valide' WHERE id=$1", [doc.id]));
  await client.query("UPDATE documents SET contenu=$1 WHERE id=$2", [doc.contenu, doc.id]);
  await client.query("UPDATE documents SET statut='valide' WHERE id=$1", [doc.id]);
  await assert.rejects(client.query("UPDATE documents SET contenu='Altération' WHERE id=$1", [doc.id]));
  await assert.rejects(client.query('DELETE FROM documents WHERE id=$1', [doc.id]));
  await assert.rejects(client.query("UPDATE approbations_documents SET signataire_nom='Altéré' WHERE document_id=$1", [doc.id]));
  await assert.rejects(client.query('DELETE FROM approbations_documents WHERE document_id=$1', [doc.id]));
  await assert.rejects(client.query('TRUNCATE approbations_documents'));
  console.log('✓ Copie liée au contenu ; document et approbation protégés');
  await client.query("UPDATE documents SET statut='brouillon', version=2, indice_revision=1 WHERE id=$1", [doc.id]);
  await client.query("UPDATE documents SET contenu='Nouvelle révision' WHERE id=$1", [doc.id]);
  assert.equal((await client.query('SELECT contenu_signe FROM approbations_documents WHERE document_id=$1', [doc.id])).rows[0].contenu_signe, copie);
  assert.equal((await verifier(doc.officine_id)).verifiees, '1');
  console.log('✓ Révision sans perte de la copie approuvée, audit attribué à la bonne officine');

  await client.query(`ALTER TABLE documents ADD COLUMN archived boolean DEFAULT false;
    CREATE TABLE fichiers_documents (id uuid PRIMARY KEY, officine_id uuid, document_id uuid, version_document integer,
      indice_revision integer, numero integer, nom_original text, mime text, octets bigint, sha256 text,
      chemin text, depose_par uuid, depose_le timestamptz, conserver_jusqu_au date,
      UNIQUE(document_id, numero));`);
  const migrationFichiers = readFileSync(new URL('../backend/database/migrations/2026_11_06_170000_create_fichiers_documents.php', import.meta.url), 'utf8');
  const blocs = [...migrationFichiers.matchAll(/DB::unprepared\(<<<'SQL'\n([\s\S]*?)\n        SQL\);/g)];
  await client.query(blocs[0][1]); await client.query(blocs[1][1]);
  const fichier = { id: randomUUID(), numero: 1, nom_original: 'preuve.pdf', mime: 'application/pdf', octets: 123, sha256: 'a'.repeat(64) };
  await client.query(`INSERT INTO fichiers_documents (id, officine_id, document_id, version_document, indice_revision,
    numero, nom_original, mime, octets, sha256) VALUES ($1,$2,$3,2,1,1,$4,$5,$6,$7)`,
    [fichier.id, doc.officine_id, doc.id, fichier.nom_original, fichier.mime, fichier.octets, fichier.sha256]);
  const snapshotAvecFichier = JSON.stringify({ ...doc, version: 2, indice_revision: 1, contenu: 'Nouvelle révision', fichiers: [fichier] });
  await client.query(`INSERT INTO approbations_documents (id, officine_id, document_id, version, indice_revision,
    signataire_id, signataire_nom, contenu_signe, empreinte_contenu, approuve_le) VALUES
    ($1,$2,$3,2,1,$4,'Recette',$5,encode(sha256(convert_to($5,'UTF8')),'hex'),now())`,
    [randomUUID(), doc.officine_id, doc.id, randomUUID(), snapshotAvecFichier]);
  await client.query("UPDATE documents SET statut='valide' WHERE id=$1", [doc.id]);
  await assert.rejects(client.query(`INSERT INTO fichiers_documents (id, officine_id, document_id, version_document,
    indice_revision, numero) VALUES ($1,$2,$3,2,1,2)`, [randomUUID(), doc.officine_id, doc.id]));
  await assert.rejects(client.query("UPDATE fichiers_documents SET sha256='altéré' WHERE id=$1", [fichier.id]));
  await assert.rejects(client.query('DELETE FROM fichiers_documents WHERE id=$1', [fichier.id]));
  await assert.rejects(client.query('TRUNCATE fichiers_documents'));
  console.log('✓ Manifeste de pièces inclus dans l’approbation ; ajout postérieur et modification des métadonnées bloqués');

  await client.query(`CREATE TABLE imports_corpus (id uuid PRIMARY KEY, officine_id uuid, manifeste_sha256 text,
    operateur_id uuid, manifeste jsonb, bilan jsonb, importe_le timestamptz, UNIQUE(officine_id, manifeste_sha256));
    CREATE TABLE imports_corpus_fichiers (id uuid PRIMARY KEY, officine_id uuid, cle_source text,
    chemin_source text, document_id uuid, fichier_id uuid, UNIQUE(officine_id, cle_source));`);
  const migrationImports = readFileSync(new URL('../backend/database/migrations/2026_11_06_180000_create_imports_corpus.php', import.meta.url), 'utf8');
  const templateImports = migrationImports.match(/DB::unprepared\("([\s\S]*?)"\);/)[1];
  for (const table of ['imports_corpus', 'imports_corpus_fichiers']) {
    await client.query(templateImports.replaceAll('{$table}', table));
  }
  const importId = randomUUID();
  await client.query(`INSERT INTO imports_corpus (id, officine_id, manifeste_sha256, bilan) VALUES ($1,$2,$3,'{"sources_creees":1,"approbations_creees":0}')`, [importId, doc.officine_id, 'c'.repeat(64)]);
  await assert.rejects(client.query('INSERT INTO imports_corpus (id,officine_id,manifeste_sha256) VALUES ($1,$2,$3)', [randomUUID(), doc.officine_id, 'c'.repeat(64)]));
  await assert.rejects(client.query("UPDATE imports_corpus SET bilan='{}' WHERE id=$1", [importId]));
  await assert.rejects(client.query('TRUNCATE imports_corpus'));
  const sourceId = randomUUID();
  await client.query('INSERT INTO imports_corpus_fichiers (id,officine_id,cle_source) VALUES ($1,$2,$3)', [sourceId, doc.officine_id, 'd'.repeat(64)]);
  await assert.rejects(client.query('INSERT INTO imports_corpus_fichiers (id,officine_id,cle_source) VALUES ($1,$2,$3)', [randomUUID(), doc.officine_id, 'd'.repeat(64)]));
  await assert.rejects(client.query('DELETE FROM imports_corpus_fichiers WHERE id=$1', [sourceId]));
  assert.equal((await verifier(doc.officine_id)).premiere_rupture, null);
  console.log('✓ Reçus d’import privés, uniques, protégés et inclus dans l’audit');

} finally {
  if (client) await client.end();
  if (cree) await admin.query(`DROP DATABASE "${db}" WITH (FORCE)`);
  await admin.end();
}
