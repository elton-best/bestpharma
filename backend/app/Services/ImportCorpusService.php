<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

class ImportCorpusService
{
    public function verifier(string $json, string $racine): array
    {
        $m = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($m)) throw new InvalidArgumentException('Manifeste source invalide.');
        $racine = realpath($racine);
        if (!$racine || !is_dir($racine) || ($m['schema'] ?? null) !== 'begpharma.corpus.sources.v1'
            || ($m['statut'] ?? null) !== 'pret_pour_import_sources_non_approuvees'
            || !is_array($m['fichiers'] ?? null) || !$m['fichiers']
            || !is_array($m['documents_inventories'] ?? null)
            || ($m['bilan']['fichiers_a_importer'] ?? null) !== count($m['fichiers'])
            || ($m['bilan']['lignes_inventaire'] ?? null) !== count($m['documents_inventories'])) {
            throw new InvalidArgumentException('Manifeste source invalide.');
        }
        $cles = [];
        foreach ($m['fichiers'] as $f) {
            $relatif = $f['chemin'] ?? '';
            $path = is_string($relatif) ? realpath($racine.DIRECTORY_SEPARATOR.$relatif) : false;
            if (!$path || !is_file($path) || !str_starts_with($path, $racine.DIRECTORY_SEPARATOR)
                || !in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'odt'], true)
                || ($f['mode_import'] ?? null) !== 'source_a_verifier'
                || ($f['code_documentaire_confirme'] ?? null) !== null
                || ($f['sha256'] ?? null) !== hash_file('sha256', $path)
                || ($f['octets'] ?? null) !== filesize($path) || filesize($path) > 30 * 1024 * 1024
                || ($f['cle_source'] ?? null) !== hash('sha256', $relatif."\n".$f['sha256'])
                || isset($cles[$f['cle_source']])) {
                throw new InvalidArgumentException('Fichier absent, modifié, répété ou hors du répertoire autorisé.');
            }
            $cles[$f['cle_source']] = true;
        }
        return $m;
    }

    public function importer(string $json, string $racine, string $officineId, string $operateurId): array
    {
        $m = $this->verifier($json, $racine);
        $racine = realpath($racine);
        $nouveauxChemins = [];
        try {
            return DB::transaction(function () use ($m, $json, $racine, $officineId, $operateurId, &$nouveauxChemins) {
                $operateur = DB::table('users')->where('id', $operateurId)->where('actif', true)->where('archived', false)->first();
                $role = DB::table('utilisateurs_officines')->where('officine_id', $officineId)->where('user_id', $operateurId)
                    ->where('actif', true)->where('archived', false)->value('role_code');
                if (!$operateur || !in_array($role, ['promoteur', 'pharmacien_titulaire', 'rmq'], true)) {
                    throw new InvalidArgumentException('Opérateur actif et habilité requis pour cette officine.');
                }
                DB::select("SELECT set_config('app.current_user_id', ?, true), set_config('app.current_user_email', ?, true)", [$operateurId, $operateur->email]);
                if (!DB::table('officines')->where('id', $officineId)->where('actif', true)->where('archived', false)->lockForUpdate()->first()) {
                    throw new InvalidArgumentException('Officine active introuvable.');
                }
                $crees = 0;
                $existants = 0;
                foreach ($m['fichiers'] as $f) {
                    $recu = DB::table('imports_corpus_fichiers')->where('officine_id', $officineId)->where('cle_source', $f['cle_source'])->first();
                    if ($recu) {
                        $stocke = DB::table('fichiers_documents')->where('id', $recu->fichier_id)->where('officine_id', $officineId)->first();
                        if (!$stocke || $stocke->sha256 !== $f['sha256'] || !Storage::disk('ged')->exists($stocke->chemin)
                            || !hash_equals($f['sha256'], hash_file('sha256', Storage::disk('ged')->path($stocke->chemin)))) {
                            throw new \RuntimeException('Une pièce déjà importée est absente ou altérée. Import arrêté.');
                        }
                        $existants++;
                        continue;
                    }
                    $doc = (string) Str::uuid();
                    $piece = (string) Str::uuid();
                    $date = now();
                    DB::table('documents')->insert([
                        'id' => $doc, 'officine_id' => $officineId, 'code_document' => 'SRC-'.substr($f['cle_source'], 0, 20),
                        'titre' => mb_substr(pathinfo($f['chemin'], PATHINFO_FILENAME), 0, 255),
                        'type_doc' => 'piece_source', 'categorie' => 'source_corpus', 'processus' => 'QAM',
                        'contenu' => 'Pièce source du corpus documentaire. Son code, son processus et sa version doivent être vérifiés avant toute mise en vigueur.',
                        'version' => 1, 'indice_revision' => 0, 'statut' => 'brouillon', 'modele' => false,
                        'redacteur_nom' => 'Source documentaire à vérifier', 'created_by' => $operateurId, 'archived' => false,
                        'created_at' => $date, 'updated_at' => $date,
                    ]);
                    $path = realpath($racine.DIRECTORY_SEPARATOR.$f['chemin']);
                    if (!$path || !str_starts_with($path, $racine.DIRECTORY_SEPARATOR) || !hash_equals($f['sha256'], hash_file('sha256', $path))) {
                        throw new \RuntimeException('La source a changé pendant l’import.');
                    }
                    $chemin = "{$officineId}/{$doc}/{$piece}";
                    $nouveauxChemins[] = $chemin;
                    $flux = fopen($path, 'rb');
                    try {
                        if (!Storage::disk('ged')->put($chemin, $flux)) throw new \RuntimeException('Écriture privée impossible.');
                    } finally { if (is_resource($flux)) fclose($flux); }
                    if (!hash_equals($f['sha256'], hash_file('sha256', Storage::disk('ged')->path($chemin)))) {
                        throw new \RuntimeException('La copie stockée diffère de la source.');
                    }
                    DB::table('fichiers_documents')->insert([
                        'id' => $piece, 'officine_id' => $officineId, 'document_id' => $doc, 'version_document' => 1,
                        'indice_revision' => 0, 'numero' => 1, 'nom_original' => mb_substr(basename($f['chemin']), 0, 200),
                        'mime' => (new \finfo(FILEINFO_MIME_TYPE))->file($path), 'octets' => $f['octets'],
                        'sha256' => $f['sha256'], 'chemin' => $chemin, 'depose_par' => $operateurId,
                        'depose_le' => $date, 'conserver_jusqu_au' => $date->copy()->addYears(10)->toDateString(),
                    ]);
                    DB::table('imports_corpus_fichiers')->insert([
                        'id' => (string) Str::uuid(), 'officine_id' => $officineId, 'cle_source' => $f['cle_source'],
                        'chemin_source' => $f['chemin'], 'document_id' => $doc, 'fichier_id' => $piece,
                    ]);
                    $crees++;
                }
                $bilan = ['sources_creees' => $crees, 'sources_deja_presentes' => $existants,
                    'lignes_inventaire_a_rapprocher' => count($m['documents_inventories']),
                    'fichiers_exclus' => count($m['exclus'] ?? []), 'approbations_creees' => 0];
                $deja = DB::table('imports_corpus')->where('officine_id', $officineId)->where('manifeste_sha256', hash('sha256', $json))->exists();
                if (!$deja) DB::table('imports_corpus')->insert([
                    'id' => (string) Str::uuid(), 'officine_id' => $officineId, 'manifeste_sha256' => hash('sha256', $json),
                    'operateur_id' => $operateurId, 'manifeste' => $json, 'bilan' => json_encode($bilan, JSON_THROW_ON_ERROR), 'importe_le' => now(),
                ]);
                return $bilan;
            });
        } catch (\Throwable $e) {
            foreach ($nouveauxChemins as $chemin) Storage::disk('ged')->delete($chemin);
            throw $e;
        }
    }
}
