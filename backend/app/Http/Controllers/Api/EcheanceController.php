<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Echeance;
use Illuminate\Http\Request;

class EcheanceController extends Controller
{
    public function index($officineId)
    {
        $echeances = Echeance::where('officine_id', $officineId)
            ->where('archived', false)
            ->orderBy('fait')
            ->orderBy('date_echeance')
            ->get();

        return response()->json($echeances);
    }

    public function indexGlobal(Request $request)
    {
        $officineId = $request->query('officine_id');
        $query = Echeance::where('archived', false);
        if ($officineId) {
            $query->where('officine_id', $officineId);
        }

        $echeances = $query->orderBy('fait')
            ->orderBy('date_echeance')
            ->get();

        return response()->json($echeances);
    }

    public function store(Request $request, $officineId = null)
    {
        $validated = $request->validate([
            'titre' => 'required|string|max:255',
            'responsable' => 'nullable|string|max:255',
            'categorie' => 'nullable|string|max:100',
            'priorite' => 'nullable|string|in:critique,important,information',
            'date_echeance' => 'required|date',
            'periodicite' => 'nullable|string|in:unique,mensuelle,trimestrielle,semestrielle,annuelle',
            'reglementaire' => 'nullable|boolean',
            'notes' => 'nullable|string',
            'officine_id' => 'nullable|uuid',
        ]);

        $finalOfficineId = $officineId 
            ?: ($validated['officine_id'] ?? null)
            ?: $request->user()?->officines()->first()?->id;

        $echeance = Echeance::create([
            'officine_id' => $finalOfficineId,
            'titre' => $validated['titre'],
            'responsable' => $validated['responsable'] ?? null,
            'categorie' => $validated['categorie'] ?? 'reglementaire',
            'priorite' => $validated['priorite'] ?? 'important',
            'date_echeance' => $validated['date_echeance'],
            'periodicite' => $validated['periodicite'] ?? 'annuelle',
            'reglementaire' => $validated['reglementaire'] ?? true,
            'notes' => $validated['notes'] ?? null,
            'fait' => false,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json($echeance, 201);
    }

    public function update(Request $request, $id)
    {
        $echeance = Echeance::findOrFail($id);

        // Règle ECH-07 : Report interdit pour les échéances réglementaires
        if ($request->has('date_echeance') && $request->input('date_echeance') != $echeance->date_echeance?->format('Y-m-d')) {
            if ($echeance->reglementaire && !$request->boolean('fait')) {
                return response()->json([
                    'message' => 'Règle ECH-07 : Les échéances réglementaires ne peuvent pas être reportées. Elles doivent être régularisées avec justificatif ou signalées en retard.',
                ], 422);
            }
        }

        $fields = $request->only([
            'titre',
            'responsable',
            'categorie',
            'priorite',
            'date_echeance',
            'periodicite',
            'reglementaire',
            'fait',
            'date_realisation',
            'preuve_titre',
            'justificatif_url',
            'notes',
            'archived'
        ]);

        // Si l'échéance vient d'être clôturée (fait = true)
        if ($request->has('fait') && $request->boolean('fait') && !$echeance->fait) {
            $fields['date_realisation'] = $request->input('date_realisation', date('Y-m-d'));
            
            // Calcul automatique de la prochaine échéance si récurrente
            if ($echeance->periodicite && $echeance->periodicite !== 'unique' && $request->boolean('recreer_suivante', true)) {
                $prochaineDate = match ($echeance->periodicite) {
                    'mensuelle' => date('Y-m-d', strtotime('+1 month', strtotime($echeance->date_echeance))),
                    'trimestrielle' => date('Y-m-d', strtotime('+3 months', strtotime($echeance->date_echeance))),
                    'semestrielle' => date('Y-m-d', strtotime('+6 months', strtotime($echeance->date_echeance))),
                    default => date('Y-m-d', strtotime('+1 year', strtotime($echeance->date_echeance))),
                };

                Echeance::create([
                    'officine_id' => $echeance->officine_id,
                    'titre' => $echeance->titre,
                    'responsable' => $echeance->responsable,
                    'categorie' => $echeance->categorie,
                    'priorite' => $echeance->priorite,
                    'date_echeance' => $prochaineDate,
                    'periodicite' => $echeance->periodicite,
                    'reglementaire' => $echeance->reglementaire,
                    'fait' => false,
                    'created_by' => $request->user()?->id,
                ]);
            }
        }

        $echeance->update($fields);

        return response()->json($echeance);
    }

    public function destroy($id)
    {
        $echeance = Echeance::findOrFail($id);
        $echeance->update(['archived' => true]);

        return response()->json(['message' => 'Échéance archivée.']);
    }

    public function exportIcal($officineId)
    {
        $echeances = Echeance::where('officine_id', $officineId)
            ->where('archived', false)
            ->where('fait', false)
            ->orderBy('date_echeance')
            ->get();

        $vcal = "BEGIN:VCALENDAR\r\n";
        $vcal .= "VERSION:2.0\r\n";
        $vcal .= "PRODID:-//BestPharma//BPD ABMed Reglementaire//FR\r\n";
        $vcal .= "CALSCALE:GREGORIAN\r\n";
        $vcal .= "METHOD:PUBLISH\r\n";
        $vcal .= "X-WR-CALNAME:BestPharma - Échéancier Réglementaire\r\n";
        $vcal .= "X-WR-TIMEZONE:Africa/Porto-Novo\r\n";

        foreach ($echeances as $e) {
            $dt = str_replace('-', '', $e->date_echeance?->format('Y-m-d') ?? date('Ymd'));
            $vcal .= "BEGIN:VEVENT\r\n";
            $vcal .= "UID:" . $e->id . "@bestpharma.bj\r\n";
            $vcal .= "DTSTAMP:" . gmdate('Ymd\THis\Z') . "\r\n";
            $vcal .= "DTSTART;VALUE=DATE:" . $dt . "\r\n";
            $vcal .= "SUMMARY:[BestPharma] " . addcslashes($e->titre, ",;") . "\r\n";
            $vcal .= "DESCRIPTION:Catégorie : " . $e->categorie . "\\nPriorité : " . $e->priorite . "\\nResponsable : " . ($e->responsable ?? 'RMQ') . "\r\n";
            $vcal .= "STATUS:CONFIRMED\r\n";
            $vcal .= "END:VEVENT\r\n";
        }

        $vcal .= "END:VCALENDAR\r\n";

        return response($vcal, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="echeances-bestpharma.ics"',
        ]);
    }
}
