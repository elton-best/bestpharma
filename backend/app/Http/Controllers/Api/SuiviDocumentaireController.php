<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CatalogueSuivisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SuiviDocumentaireController extends Controller
{
    public function definition(Request $request, string $officineId, string $type): JsonResponse
    {
        $role = $this->autoriser($request, $officineId);
        $definition = $this->catalogue($type);
        $definition['peut_ecrire'] = in_array($role, ['promoteur', 'pharmacien_titulaire', 'pharmacien_adjoint', 'rmq'], true);
        $definition['equipements'] = $type === 'maintenance'
            ? DB::table('equipements_officine')->where('officine_id', $officineId)->orderBy('designation')->get(['id', 'designation', 'code_interne']) : [];
        return response()->json($definition);
    }

    public function index(Request $request, string $officineId, string $type): JsonResponse
    {
        $this->autoriser($request, $officineId);
        $definition = $this->catalogue($type);
        $request->validate(['annee' => 'nullable|integer|between:2000,2100', 'statut' => 'nullable|in:planifie,realise,annule', 'q' => 'nullable|string|max:150']);
        $query = DB::table('suivis_documentaires')->where('officine_id', $officineId)->where('type', $type);
        if ($request->filled('annee')) {
            $champ = $definition['champ_date'];
            $query->whereRaw("donnees->>? >= ? AND donnees->>? <= ?", [$champ, $request->annee.'-01-01', $champ, $request->annee.'-12-31']);
        }
        if ($request->filled('statut')) $query->where('statut', $request->statut);
        if ($request->filled('q')) {
            $champ = $definition['champ_titre'];
            $query->whereRaw('donnees->>? ILIKE ?', [$champ, '%'.$request->q.'%']);
        }
        $p = $query->orderByDesc('created_at')->orderBy('id')->paginate(25);
        $p->getCollection()->transform(fn ($r) => $this->decoder($r));
        return response()->json($p);
    }

    public function store(Request $request, string $officineId, string $type): JsonResponse
    {
        $this->autoriser($request, $officineId, true);
        $definition = $this->catalogue($type);
        $v = $this->valider($request, $officineId, $definition, false);
        $id = (string) Str::uuid();
        DB::table('suivis_documentaires')->insert([
            'id' => $id, 'officine_id' => $officineId, 'type' => $type, 'statut' => $v['statut'], 'revision' => 1,
            'donnees' => json_encode($v['donnees'], JSON_THROW_ON_ERROR), 'source' => json_encode($definition['source'], JSON_THROW_ON_ERROR),
            'created_by' => $request->user()->id, 'updated_by' => $request->user()->id,
            'motif_modification' => null, 'created_at' => now(), 'updated_at' => now(),
        ]);
        return response()->json($this->decoder(DB::table('suivis_documentaires')->where('id', $id)->first()), 201);
    }

    public function update(Request $request, string $officineId, string $type, string $id): JsonResponse
    {
        $this->autoriser($request, $officineId, true);
        $definition = $this->catalogue($type);
        abort_unless(Str::isUuid($id), 404);
        $v = $this->valider($request, $officineId, $definition, true);
        return DB::transaction(function () use ($request, $officineId, $type, $id, $v) {
            $r = DB::table('suivis_documentaires')->where('officine_id', $officineId)->where('type', $type)->where('id', $id)->lockForUpdate()->first();
            abort_unless($r, 404);
            abort_unless((int) $r->revision === (int) $v['revision'], 409, 'Cette fiche a changé. Rechargez le registre avant de corriger.');
            abort_if($r->statut !== 'planifie' && $r->statut !== $v['statut'], 409, 'Une fiche réalisée ou annulée conserve son état ; corrigez ses informations avec un motif.');
            DB::table('suivis_documentaires')->where('id', $id)->update([
                'donnees' => json_encode($v['donnees'], JSON_THROW_ON_ERROR), 'statut' => $v['statut'],
                'revision' => $r->revision + 1, 'motif_modification' => $v['motif_modification'],
                'updated_by' => $request->user()->id, 'updated_at' => now(),
            ]);
            return response()->json($this->decoder(DB::table('suivis_documentaires')->where('id', $id)->first()));
        });
    }

    private function valider(Request $request, string $officineId, array $d, bool $modification): array
    {
        $cles = array_column($d['champs'], 'cle');
        $cles[] = 'motif_annulation';
        $regles = ['statut' => 'required|in:planifie,realise,annule', 'donnees' => 'required|array:'.implode(',', $cles)];
        $noms = ['donnees' => 'champs du formulaire', 'statut' => 'état', 'revision' => 'version du suivi', 'motif_modification' => 'motif de correction', 'donnees.motif_annulation' => 'motif d’annulation'];
        foreach ($d['champs'] as $c) {
            $requis = ($c['obligatoire'] ?? false) || (($c['obligatoire_realise'] ?? false) && $request->statut === 'realise');
            $cle = 'donnees.'.$c['cle'];
            $regles[$cle] = ($requis ? 'required' : 'nullable').'|'.($c['type'] === 'date' ? 'date_format:Y-m-d' : ($c['type'] === 'equipement' ? 'uuid' : 'string|max:5000'));
            $noms[$cle] = $c['libelle'];
        }
        $regles['donnees.motif_annulation'] = ($request->statut === 'annule' ? 'required' : 'nullable').'|string|max:5000';
        $regles['donnees.date_realisation'] .= '|before_or_equal:'.now('Africa/Porto-Novo')->toDateString();
        if ($d['type'] === 'formations') $regles['donnees.date_fin_prevue'] .= '|after_or_equal:donnees.date_debut_prevue';
        if ($d['type'] === 'maintenance') {
            $regles['donnees.equipement_id'] = ['required', 'uuid', Rule::exists('equipements_officine', 'id')->where('officine_id', $officineId)];
            $regles['donnees.date_prochaine_intervention'] .= '|after_or_equal:'.($request->filled('donnees.date_realisation') ? 'donnees.date_realisation' : 'donnees.date_prevue');
        }
        if ($modification) {
            $regles['revision'] = 'required|integer|min:1';
            $regles['motif_modification'] = 'required|string|min:5|max:5000';
        }
        $v = $request->validate($regles, [
            'required' => 'Le champ :attribute est obligatoire.', 'array' => 'Les champs du formulaire ne sont pas autorisés ou sont incomplets.',
            'in' => 'La valeur du champ :attribute n’est pas autorisée.', 'integer' => 'Le champ :attribute doit être un nombre entier.',
            'string' => 'Le champ :attribute doit contenir du texte.', 'max' => 'Le champ :attribute est trop long.',
            'min' => 'Le champ :attribute est trop court.', 'uuid' => 'Choisissez une valeur valide pour :attribute.',
            'exists' => 'Choisissez un matériel appartenant à cette officine.', 'date_format' => 'Le champ :attribute doit être une date valide.',
            'before_or_equal' => 'La date de réalisation ne peut pas être dans le futur.',
            'after_or_equal' => 'Vérifiez l’ordre chronologique des dates du formulaire.',
        ], $noms);
        if ($d['type'] === 'maintenance') {
            $v['donnees']['equipement_nom'] = DB::table('equipements_officine')->where('id', $v['donnees']['equipement_id'])->where('officine_id', $officineId)->value('designation');
        }
        return $v;
    }

    private function catalogue(string $type): array
    {
        abort_unless(in_array($type, ['formations', 'maintenance'], true), 404);
        return app(CatalogueSuivisService::class)->definition($type);
    }

    private function decoder(object $r): object
    {
        $r->donnees = json_decode($r->donnees, true, 512, JSON_THROW_ON_ERROR);
        $r->source = json_decode($r->source, true, 512, JSON_THROW_ON_ERROR);
        return $r;
    }

    private function autoriser(Request $request, string $officineId, bool $ecrire = false): string
    {
        abort_unless(Str::isUuid($officineId), 404);
        abort_unless($request->user() && $request->user()->actif && !$request->user()->archived, 403);
        $role = DB::table('utilisateurs_officines')->where('officine_id', $officineId)->where('user_id', $request->user()->id)
            ->where('actif', true)->where('archived', false)->value('role_code');
        abort_unless($role, 403);
        if ($ecrire) abort_unless(in_array($role, ['promoteur', 'pharmacien_titulaire', 'pharmacien_adjoint', 'rmq'], true), 403);
        return $role;
    }
}
