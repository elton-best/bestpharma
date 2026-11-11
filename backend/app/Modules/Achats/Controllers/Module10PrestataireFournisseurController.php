<?php

declare(strict_types=1);

namespace App\Modules\Achats\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Achats\Models\Supplier;
use App\Modules\Achats\Models\SupplierComplaint;
use App\Modules\Achats\Models\SupplierContact;
use App\Modules\Achats\Models\SupplierContract;
use App\Modules\Achats\Models\SupplierDocument;
use App\Modules\Achats\Models\SupplierEvaluation;
use App\Modules\Achats\Models\SupplierEvaluationTemplate;
use App\Modules\Achats\Models\SupplierQuote;
use App\Modules\Achats\Models\SupplierSelection;
use App\Modules\Qualite\Models\QualityAction;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Module10PrestataireFournisseurController extends Controller
{
    protected function getOfficineId(Request $request): int
    {
        $tenantId = app()->bound('tenant.officine_id') ? app('tenant.officine_id') : null;
        $headerId = $request->header('X-Officine-ID');
        return (int) ($tenantId ?? $headerId ?? 1);
    }

    protected function checkPermission(Request $request, string $permission): void
    {
        $isAdmin = (bool) $request->attributes->get('officine.is_admin', false);
        if ($isAdmin) {
            return;
        }

        $perms = $request->attributes->get('officine.permissions', []);
        if (empty($perms)) {
            return;
        }

        $altPerm = str_starts_with($permission, 'achats.')
            ? str_replace('achats.', 'qualite.', $permission)
            : str_replace('qualite.', 'achats.', $permission);

        abort_unless(
            in_array($permission, $perms, true)
            || in_array($altPerm, $perms, true)
            || in_array('admin', $perms, true),
            403,
            "Permission {$permission} requise."
        );
    }

    /**
     * Indicateurs consolidés Prestataires & Fournisseurs (CDC 6)
     */
    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.read');
        $officineId = $this->getOfficineId($request);
        $today = Carbon::today()->toDateString();
        $in30Days = Carbon::today()->addDays(30)->toDateString();

        $totalSuppliers = Supplier::where('officine_id', $officineId)->count();
        $activeSuppliers = Supplier::where('officine_id', $officineId)->where('status', 'actif')->count();
        $qualifiedSuppliers = Supplier::where('officine_id', $officineId)->where('status', 'qualifie')->count();

        $pendingSelections = SupplierSelection::where('officine_id', $officineId)->where('status', 'comparaison')->count();
        $pendingEvaluations = Supplier::where('officine_id', $officineId)->where('status', 'a_evaluer')->count();
        $openComplaints = SupplierComplaint::where('officine_id', $officineId)->whereIn('status', ['ouvert', 'transmis'])->count();

        // Contrats à renouveler sous 30 jours
        $expiringContracts = SupplierContract::where('officine_id', $officineId)
            ->where('status', 'actif')
            ->whereBetween('end_date', [$today, $in30Days])
            ->count();

        // Note moyenne globale des prestataires
        $avgScore = Supplier::where('officine_id', $officineId)->where('average_rating', '>', 0)->avg('average_rating');

        return response()->json([
            'meta' => [
                'officine_id' => $officineId,
                'as_of' => now()->toIso8601String(),
            ],
            'kpis' => [
                'total_suppliers' => $totalSuppliers,
                'active_suppliers' => $activeSuppliers,
                'qualified_suppliers' => $qualifiedSuppliers,
                'pending_selections' => $pendingSelections,
                'pending_evaluations' => $pendingEvaluations,
                'open_complaints' => $openComplaints,
                'expiring_contracts' => $expiringContracts,
                'average_score' => $avgScore ? round((float) $avgScore, 2) : 'non disponible',
            ],
        ]);
    }

    // ==========================================
    // 1. SUPPLIERS (Référentiel Fournisseurs - CDC 3.1)
    // ==========================================

    public function suppliersIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.read');
        $officineId = $this->getOfficineId($request);

        $query = Supplier::with(['contacts', 'documents'])
            ->where('officine_id', $officineId);

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }
        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }
        if ($request->filled('search')) {
            $search = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('code', 'ilike', $search)
                    ->orWhere('name', 'ilike', $search)
                    ->orWhere('ifu', 'ilike', $search)
                    ->orWhere('email', 'ilike', $search);
            });
        }

        $suppliers = $query->orderBy('name')->get();
        return response()->json(['data' => $suppliers]);
    }

    public function storeSupplier(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:150',
            'type' => 'required|string|in:grossiste,fabricant,prestataire_service,transporteur,maintenance,autre',
            'category' => 'sometimes|string|in:produits_sante,chaine_froid,securite,locaux,informatique,divers',
            'ifu' => 'nullable|string|max:50',
            'rccm' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:200',
            'city' => 'nullable|string|max:100',
            'country' => 'sometimes|string|max:100',
            'status' => 'sometimes|string|in:actif,a_evaluer,qualifie,suspendu,radie',
            'notes' => 'nullable|string',
            'primary_contact_name' => 'nullable|string|max:100',
            'primary_contact_phone' => 'nullable|string|max:50',
            'primary_contact_email' => 'nullable|email|max:100',
        ]);

        // Contrôle des doublons (CDC 3.1)
        $existing = Supplier::where('officine_id', $officineId)
            ->where(function ($q) use ($validated) {
                $q->where('code', $validated['code'])
                    ->orWhere('name', 'ilike', $validated['name']);
            })
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Un fournisseur avec ce code ou ce nom existe déjà.'], 422);
        }

        return DB::transaction(function () use ($validated, $officineId) {
            $supplier = Supplier::create([
                'officine_id' => $officineId,
                'code' => $validated['code'],
                'name' => $validated['name'],
                'type' => $validated['type'],
                'category' => $validated['category'] ?? 'produits_sante',
                'ifu' => $validated['ifu'] ?? null,
                'rccm' => $validated['rccm'] ?? null,
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'address' => $validated['address'] ?? null,
                'city' => $validated['city'] ?? 'Cotonou',
                'country' => $validated['country'] ?? 'Bénin',
                'status' => $validated['status'] ?? 'actif',
                'notes' => $validated['notes'] ?? null,
                'version' => 1,
            ]);

            if (!empty($validated['primary_contact_name'])) {
                SupplierContact::create([
                    'officine_id' => $officineId,
                    'supplier_id' => $supplier->id,
                    'name' => $validated['primary_contact_name'],
                    'phone' => $validated['primary_contact_phone'] ?? null,
                    'email' => $validated['primary_contact_email'] ?? null,
                    'is_primary' => true,
                ]);
            }

            return response()->json(['data' => $supplier->load('contacts')], 201);
        });
    }

    public function showSupplier(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'achats.read');
        $officineId = $this->getOfficineId($request);

        $supplier = Supplier::with(['contacts', 'documents', 'evaluations.evaluator:id,name', 'complaints', 'contracts'])
            ->where('officine_id', $officineId)
            ->find($id);

        if (!$supplier) {
            return response()->json(['message' => 'Fournisseur non trouvé.'], 404);
        }

        return response()->json(['data' => $supplier]);
    }

    public function updateSupplier(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'achats.write');
        $officineId = $this->getOfficineId($request);

        $supplier = Supplier::where('officine_id', $officineId)->find($id);
        if (!$supplier) {
            return response()->json(['message' => 'Fournisseur non trouvé.'], 404);
        }

        if ($request->has('version') && (int) $request->input('version') !== (int) $supplier->version) {
            return response()->json(['message' => 'Conflit de version concurrentielle (409).'], 409);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'type' => 'sometimes|required|string|in:grossiste,fabricant,prestataire_service,transporteur,maintenance,autre',
            'category' => 'sometimes|required|string|in:produits_sante,chaine_froid,securite,locaux,informatique,divers',
            'ifu' => 'nullable|string|max:50',
            'rccm' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:200',
            'city' => 'nullable|string|max:100',
            'status' => 'sometimes|required|string|in:actif,a_evaluer,qualifie,suspendu,radie',
            'notes' => 'nullable|string',
        ]);

        $supplier->update([
            ...$validated,
            'version' => $supplier->version + 1,
        ]);

        return response()->json(['data' => $supplier]);
    }

    // ==========================================
    // 2. SELECTIONS & QUOTES (CDC 3.2 & 7)
    // ==========================================

    public function selectionsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.read');
        $officineId = $this->getOfficineId($request);

        $selections = SupplierSelection::with(['selectedSupplier:id,code,name', 'quotes.supplier:id,code,name', 'createdBy:id,name', 'validatedBy:id,name'])
            ->where('officine_id', $officineId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $selections]);
    }

    public function storeSelection(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reference' => 'required|string|max:50',
            'title' => 'required|string|max:150',
            'need_description' => 'required|string',
            'selection_criteria' => 'nullable|array',
            'quotes' => 'nullable|array',
            'quotes.*.supplier_id' => 'required_with:quotes|integer',
            'quotes.*.amount' => 'required_with:quotes|numeric|min:0',
            'quotes.*.delivery_days' => 'nullable|integer',
            'quotes.*.technical_score' => 'nullable|numeric|min:0|max:100',
            'quotes.*.financial_score' => 'nullable|numeric|min:0|max:100',
            'quotes.*.total_score' => 'nullable|numeric|min:0|max:100',
        ]);

        $existing = SupplierSelection::where('officine_id', $officineId)
            ->where('reference', $validated['reference'])
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Cette référence de sélection existe déjà.'], 422);
        }

        return DB::transaction(function () use ($validated, $officineId, $request) {
            $selection = SupplierSelection::create([
                'officine_id' => $officineId,
                'reference' => $validated['reference'],
                'title' => $validated['title'],
                'need_description' => $validated['need_description'],
                'selection_criteria' => $validated['selection_criteria'] ?? null,
                'status' => 'comparaison',
                'created_by_user_id' => $request->user()?->id ?? 1,
                'version' => 1,
            ]);

            if (!empty($validated['quotes'])) {
                foreach ($validated['quotes'] as $q) {
                    SupplierQuote::create([
                        'officine_id' => $officineId,
                        'selection_id' => $selection->id,
                        'supplier_id' => $q['supplier_id'],
                        'amount' => $q['amount'],
                        'delivery_days' => $q['delivery_days'] ?? null,
                        'technical_score' => $q['technical_score'] ?? 0.0,
                        'financial_score' => $q['financial_score'] ?? 0.0,
                        'total_score' => $q['total_score'] ?? ($q['technical_score'] ?? 0.0),
                    ]);
                }
            }

            return response()->json(['data' => $selection->load('quotes.supplier:id,code,name')], 201);
        });
    }

    public function validateSelection(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'achats.write');
        $officineId = $this->getOfficineId($request);

        $selection = SupplierSelection::where('officine_id', $officineId)->find($id);
        if (!$selection) {
            return response()->json(['message' => 'Sélection non trouvée.'], 404);
        }

        if ($selection->status === 'valide' || $selection->status === 'rejete') {
            return response()->json(['message' => 'Cette sélection a déjà été statuée.'], 422);
        }

        $validated = $request->validate([
            'decision' => 'required|string|in:valide,rejete',
            'selected_supplier_id' => 'required_if:decision,valide|nullable|integer',
            'selection_justification' => 'required_if:decision,valide|nullable|string',
        ]);

        return DB::transaction(function () use ($selection, $validated, $officineId, $request) {
            // CDC 7 : Une sélection ne modifie pas un paiement
            if ($validated['decision'] === 'valide') {
                SupplierQuote::where('selection_id', $selection->id)->update(['is_retained' => false]);
                if (!empty($validated['selected_supplier_id'])) {
                    SupplierQuote::where('selection_id', $selection->id)
                        ->where('supplier_id', $validated['selected_supplier_id'])
                        ->update(['is_retained' => true]);

                    // Le fournisseur retenu passe en statut qualifié
                    Supplier::where('officine_id', $officineId)
                        ->where('id', $validated['selected_supplier_id'])
                        ->update(['status' => 'qualifie']);
                }
            }

            $selection->update([
                'status' => $validated['decision'],
                'selected_supplier_id' => $validated['selected_supplier_id'] ?? null,
                'selection_justification' => $validated['selection_justification'] ?? null,
                'validated_by_user_id' => $request->user()?->id,
                'validated_at' => now(),
                'version' => $selection->version + 1,
            ]);

            return response()->json(['data' => $selection]);
        });
    }

    // ==========================================
    // 3. EVALUATIONS & TEMPLATES (CDC 3.3)
    // ==========================================

    public function evaluationTemplatesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.read');
        $officineId = $this->getOfficineId($request);

        $templates = SupplierEvaluationTemplate::where('officine_id', $officineId)
            ->where('is_active', true)
            ->get();

        return response()->json(['data' => $templates]);
    }

    public function evaluationsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.read');
        $officineId = $this->getOfficineId($request);

        $query = SupplierEvaluation::with(['supplier:id,code,name,type', 'evaluator:id,name'])
            ->where('officine_id', $officineId);

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', (int) $request->query('supplier_id'));
        }
        if ($request->filled('decision')) {
            $query->where('decision', $request->query('decision'));
        }

        $evaluations = $query->orderByDesc('evaluation_date')->get();
        return response()->json(['data' => $evaluations]);
    }

    public function storeEvaluation(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'supplier_id' => 'required|integer',
            'template_id' => 'nullable|integer',
            'period' => 'required|string|max:50',
            'evaluation_date' => 'required|date',
            'criteria_scores' => 'required|array',
            'criteria_scores.*.key' => 'required|string',
            'criteria_scores.*.label' => 'required|string',
            'criteria_scores.*.score' => 'required|numeric|min:1|max:5', // Notes 1 à 5 (CDC 3.3)
            'overall_score_on_5' => 'required|numeric|min:1|max:5',
            'decision' => 'required|string|in:qualifie,sous_reserve,non_reconduit,a_ameliorer',
            'strengths' => 'nullable|string',
            'weaknesses' => 'nullable|string',
            'action_required' => 'nullable|string',
        ]);

        $supplier = Supplier::where('officine_id', $officineId)->find($validated['supplier_id']);
        if (!$supplier) {
            return response()->json(['message' => 'Fournisseur non trouvé.'], 404);
        }

        return DB::transaction(function () use ($validated, $supplier, $officineId, $request) {
            $createdActionId = null;
            $percentage = round(((float) $validated['overall_score_on_5'] / 5.0) * 100, 1);

            // Si décision 'non_reconduit' ou 'a_ameliorer', création d'action qualité CAPA (M4)
            if ($validated['decision'] === 'non_reconduit' || $validated['decision'] === 'a_ameliorer') {
                $action = QualityAction::create([
                    'officine_id' => $officineId,
                    'created_by' => $request->user()?->id ?? 1,
                    'title' => "Évaluation défavorable prestataire : {$supplier->name} ({$validated['period']})",
                    'chapter' => 'Approvisionnement & Fournisseurs',
                    'severity' => $validated['decision'] === 'non_reconduit' ? 'high' : 'medium',
                    'owner' => $request->user()?->name ?? 'Responsable Achats',
                    'due_date' => now()->addDays(14)->toDateString(),
                    'status' => 'open',
                    'description' => "Score : {$validated['overall_score_on_5']}/5 ({$percentage}%). Faiblesses : " . ($validated['weaknesses'] ?? 'Non précisé'),
                    'resolution' => '',
                ]);
                $createdActionId = $action->id;
            }

            $evaluation = SupplierEvaluation::create([
                'officine_id' => $officineId,
                'supplier_id' => $supplier->id,
                'template_id' => $validated['template_id'] ?? null,
                'period' => $validated['period'],
                'evaluation_date' => $validated['evaluation_date'],
                'evaluator_user_id' => $request->user()?->id ?? 1,
                'criteria_scores' => $validated['criteria_scores'],
                'overall_score_on_5' => $validated['overall_score_on_5'],
                'percentage_score' => $percentage,
                'decision' => $validated['decision'],
                'strengths' => $validated['strengths'] ?? null,
                'weaknesses' => $validated['weaknesses'] ?? null,
                'action_required' => $validated['action_required'] ?? null,
                'created_action_id' => $createdActionId,
                'version' => 1,
            ]);

            // Recalcul de la note moyenne du fournisseur
            $newAvg = SupplierEvaluation::where('officine_id', $officineId)
                ->where('supplier_id', $supplier->id)
                ->avg('overall_score_on_5');

            $supplierStatus = $validated['decision'] === 'non_reconduit' ? 'suspendu' : ($validated['decision'] === 'qualifie' ? 'qualifie' : 'actif');

            $supplier->update([
                'average_rating' => round((float) $newAvg, 2),
                'status' => $supplierStatus,
                'version' => $supplier->version + 1,
            ]);

            return response()->json(['data' => $evaluation], 201);
        });
    }

    // ==========================================
    // 4. COMPLAINTS & CLAIMS (CDC 3.4)
    // ==========================================

    public function complaintsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.read');
        $officineId = $this->getOfficineId($request);

        $complaints = SupplierComplaint::with('supplier:id,code,name')
            ->where('officine_id', $officineId)
            ->orderByDesc('claim_date')
            ->get();

        return response()->json(['data' => $complaints]);
    }

    public function storeComplaint(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'supplier_id' => 'required|integer',
            'reference' => 'required|string|max:50',
            'claim_type' => 'required|string|in:livraison_non_conforme,retard_critique,produit_endommage,ecart_facturation,rupture_brutale,autre',
            'claim_date' => 'required|date',
            'order_reference' => 'nullable|string|max:50',
            'delivery_note_ref' => 'nullable|string|max:50',
            'description' => 'required|string',
        ]);

        $supplier = Supplier::where('officine_id', $officineId)->find($validated['supplier_id']);
        if (!$supplier) {
            return response()->json(['message' => 'Fournisseur non trouvé.'], 404);
        }

        $existing = SupplierComplaint::where('officine_id', $officineId)
            ->where('reference', $validated['reference'])
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Cette référence de réclamation existe déjà.'], 422);
        }

        return DB::transaction(function () use ($validated, $supplier, $officineId, $request) {
            // Création automatique d'une action qualité CAPA associée (Module 04)
            $action = QualityAction::create([
                'officine_id' => $officineId,
                'created_by' => $request->user()?->id ?? 1,
                'title' => "Litige fournisseur {$supplier->name} ({$validated['reference']})",
                'chapter' => 'Approvisionnement & Fournisseurs',
                'severity' => 'high',
                'owner' => $request->user()?->name ?? 'Responsable Achats',
                'due_date' => now()->addDays(5)->toDateString(),
                'status' => 'open',
                'description' => "Motif : {$validated['claim_type']} - {$validated['description']}",
                'resolution' => '',
            ]);

            $complaint = SupplierComplaint::create([
                ...$validated,
                'officine_id' => $officineId,
                'status' => 'ouvert',
                'created_action_id' => $action->id,
                'version' => 1,
            ]);

            return response()->json(['data' => $complaint], 201);
        });
    }

    public function resolveComplaint(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'achats.write');
        $officineId = $this->getOfficineId($request);

        $complaint = SupplierComplaint::where('officine_id', $officineId)->find($id);
        if (!$complaint) {
            return response()->json(['message' => 'Réclamation non trouvée.'], 404);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:reponse_recue,avoir_emis,resolu,cloture',
            'supplier_response' => 'required|string',
            'refund_or_credit_amount' => 'nullable|numeric|min:0',
        ]);

        $complaint->update([
            'status' => $validated['status'],
            'supplier_response' => $validated['supplier_response'],
            'response_received_at' => now()->toDateString(),
            'refund_or_credit_amount' => $validated['refund_or_credit_amount'] ?? $complaint->refund_or_credit_amount,
            'version' => $complaint->version + 1,
        ]);

        return response()->json(['data' => $complaint]);
    }

    // ==========================================
    // 5. CONTRACTS & DEADLINES (CDC 3.5)
    // ==========================================

    public function contractsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.read');
        $officineId = $this->getOfficineId($request);

        $contracts = SupplierContract::with('supplier:id,code,name')
            ->where('officine_id', $officineId)
            ->orderBy('end_date')
            ->get();

        return response()->json(['data' => $contracts]);
    }

    public function storeContract(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'achats.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'supplier_id' => 'required|integer',
            'contract_ref' => 'required|string|max:50',
            'title' => 'required|string|max:150',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'auto_renewal' => 'sometimes|boolean',
            'notice_days' => 'sometimes|integer|min:0|max:180',
            'terms_summary' => 'nullable|string',
        ]);

        $contract = SupplierContract::create([
            ...$validated,
            'officine_id' => $officineId,
            'status' => 'actif',
            'version' => 1,
        ]);

        return response()->json(['data' => $contract], 201);
    }
}
