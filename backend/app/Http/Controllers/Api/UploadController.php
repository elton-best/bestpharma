<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReleveTemperature;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    /**
     * Upload générique de fichiers (PDF, Attestations, Certificats, FDS, Images)
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:30720', // Jusqu'à 30 Mo
            'dossier' => 'nullable|string|max:50',
        ]);

        $file = $request->file('file');
        $dossier = $request->input('dossier', 'general');
        $dossierSecurise = preg_replace('/[^a-zA-Z0-9_\-]/', '', $dossier);

        $targetDir = public_path("uploads/{$dossierSecurise}");
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0777, true);
        }

        $extension = $file->getClientOriginalExtension() ?: 'bin';
        $originalName = $file->getClientOriginalName();
        $safeName = Str::slug(pathinfo($originalName, PATHINFO_FILENAME));
        $filename = $safeName . '_' . time() . '_' . Str::random(6) . '.' . $extension;

        $file->move($targetDir, $filename);
        $url = "/uploads/{$dossierSecurise}/{$filename}";

        return response()->json([
            'success' => true,
            'url' => $url,
            'filename' => $filename,
            'original_name' => $originalName,
            'size' => filesize("{$targetDir}/{$filename}"),
            'mime_type' => mime_content_type("{$targetDir}/{$filename}"),
            'message' => 'Fichier téléversé avec succès',
        ], 201);
    }

    /**
     * Import d'enregistrements CSV de température (Testo, Elitech, LogTag, standard)
     */
    public function uploadCsvTemperatures(Request $request, string $officineId): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:10240', // Jusqu'à 10 Mo
            'zone' => 'nullable|string',
        ]);

        $file = $request->file('file');
        $zoneDefaut = $request->input('zone', 'refrigeree_2_8');

        $content = file_get_contents($file->getRealPath());
        $lines = preg_split('/\r\n|\r|\n/', $content);

        $imported = 0;
        $excursions = 0;
        $now = Carbon::now('Africa/Porto-Novo');

        foreach ($lines as $index => $line) {
            $line = trim($line);
            if (empty($line)) continue;

            // Détection du délimiteur (; ou , ou tab)
            $delimiter = str_contains($line, ';') ? ';' : (str_contains($line, "\t") ? "\t" : ',');
            $cols = str_getcsv($line, $delimiter);

            // Ignorer l'en-tête
            if ($index === 0 && (stripos($line, 'temp') !== false || stripos($line, 'date') !== false || stripos($line, 'time') !== false)) {
                continue;
            }

            // Recherche d'une valeur numérique de température et d'une date
            $tempVal = null;
            $dateVal = $now->toDateString();
            $heureVal = $now->format('H:i');

            foreach ($cols as $col) {
                $trimmed = trim($col, " \t\n\r\0\x0B\"'");
                // Remplacement virgule décimale par point
                $normalized = str_replace(',', '.', $trimmed);

                if (is_numeric($normalized) && $tempVal === null && (float)$normalized > -30 && (float)$normalized < 60) {
                    $tempVal = (float)$normalized;
                } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', $trimmed)) {
                    $dateVal = $trimmed;
                } elseif (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $trimmed)) {
                    $parts = explode('/', $trimmed);
                    $dateVal = "{$parts[2]}-{$parts[1]}-{$parts[0]}";
                } elseif (preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $trimmed)) {
                    $heureVal = substr($trimmed, 0, 5);
                } elseif (preg_match('/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/', $trimmed, $m)) {
                    $dateVal = $m[1];
                    $heureVal = $m[2];
                }
            }

            if ($tempVal !== null) {
                $statut = 'conforme';
                if ($zoneDefaut === 'refrigeree_2_8') {
                    if ($tempVal < 2.0) {
                        $statut = 'excursion_basse';
                        $excursions++;
                    } elseif ($tempVal > 8.0) {
                        $statut = 'excursion_haute';
                        $excursions++;
                    }
                } elseif ($tempVal > 25.0) {
                    $statut = 'excursion_haute';
                    $excursions++;
                }

                $hourInt = (int)explode(':', $heureVal)[0];
                $moment = $hourInt < 14 ? 'matin' : 'soir';

                ReleveTemperature::create([
                    'officine_id' => $officineId,
                    'zone' => $zoneDefaut,
                    'temperature' => $tempVal,
                    'temp_min' => $tempVal - 0.2,
                    'temp_max' => $tempVal + 0.2,
                    'humidite' => 55.0,
                    'moment' => $moment,
                    'date_releve' => $dateVal,
                    'heure_releve' => $heureVal . ':00',
                    'statut_conformite' => $statut,
                    'agent_id' => $request->user()?->id,
                    'notes' => 'Import automatique Datalogger CSV (TEM-12)',
                ]);

                $imported++;
            }
        }

        return response()->json([
            'success' => true,
            'imported_count' => $imported,
            'excursions_count' => $excursions,
            'message' => "{$imported} relevés de température importés avec succès." . ($excursions > 0 ? " {$excursions} excursion(s) détectée(s)." : ""),
        ]);
    }
}
