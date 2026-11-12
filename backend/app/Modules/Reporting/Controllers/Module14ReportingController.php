<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Reporting\Models\DashboardPreference;
use App\Modules\Reporting\Models\MetricDefinition;
use App\Modules\Reporting\Models\NotificationJob;
use App\Modules\Reporting\Models\ReportExport;
use App\Modules\Reporting\Models\ReportRun;
use App\Modules\Reporting\Models\ReportTemplate;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Module14ReportingController extends Controller
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

        $altPerm = str_starts_with($permission, 'reporting.')
            ? str_replace('reporting.', 'qualite.', $permission)
            : str_replace('qualite.', 'reporting.', $permission);

        abort_unless(
            in_array($permission, $perms, true)
            || in_array($altPerm, $perms, true)
            || in_array('admin', $perms, true),
            403,
            "Permission {$permission} requise."
        );
    }

    /**
     * Calcul exact d'indicateurs documentés depuis les données sources d'une officine (CDC 5 & 6)
     */
    protected function computeLiveMetrics(int $officineId, string $periodStart, string $periodEnd): array
    {
        $startDt = Carbon::parse($periodStart)->startOfDay();
        $endDt = Carbon::parse($periodEnd)->endOfDay();

        // 1. Taux de clôture CAPA (Module 04)
        $capaTotal = DB::table('quality_actions')
            ->where('officine_id', $officineId)
            ->whereBetween('created_at', [$startDt, $endDt])
            ->count();
        $capaClosed = DB::table('quality_actions')
            ->where('officine_id', $officineId)
            ->whereBetween('created_at', [$startDt, $endDt])
            ->whereIn('status', ['closed', 'cloture', 'resolved'])
            ->count();

        // 2. Taux de lots vendables conformes (Module 11)
        $lotsActive = DB::table('lots')
            ->where('officine_id', $officineId)
            ->where('available_qty', '>', 0)
            ->count();
        $lotsAvailable = DB::table('lots')
            ->where('officine_id', $officineId)
            ->where('available_qty', '>', 0)
            ->where('status', 'disponible')
            ->where('is_sellable', true)
            ->count();

        // 3. Taux d'approbation pharmaceutique (Module 12)
        $reviewsTotal = DB::table('pharmaceutical_reviews')
            ->where('officine_id', $officineId)
            ->whereBetween('reviewed_at', [$startDt, $endDt])
            ->count();
        $reviewsApproved = DB::table('pharmaceutical_reviews')
            ->where('officine_id', $officineId)
            ->whereBetween('reviewed_at', [$startDt, $endDt])
            ->whereIn('decision', ['approuve', 'substitution'])
            ->count();

        // 4. Taux de sessions de caisse clôturées sans écart (Module 13)
        $sessionsClosed = DB::table('cash_sessions')
            ->where('officine_id', $officineId)
            ->where('status', 'cloturee')
            ->whereBetween('closed_at', [$startDt, $endDt])
            ->get();
        $sessionsTotal = $sessionsClosed->count();
        $sessionsClean = $sessionsClosed->filter(fn ($s) => abs((float) $s->discrepancy_amount) <= 0.01)->count();

        // 5. Chiffre d'affaires encaissé confirmé sur la période (Module 13)
        $receiptsTotal = (float) DB::table('payment_transactions')
            ->where('officine_id', $officineId)
            ->where('transaction_type', 'encaissement')
            ->where('status', 'confirme')
            ->whereBetween('occurred_at', [$startDt, $endDt])
            ->sum('amount');

        // 6. Taux de fournisseurs qualifiés (Module 10)
        $suppliersTotal = DB::table('suppliers')->where('officine_id', $officineId)->count();
        $suppliersQualified = DB::table('suppliers')->where('officine_id', $officineId)->where('status', 'qualifie')->count();

        $ratioMetric = static function (string $code, string $module, string $title, string $definition, int $num, int $den): array {
            $val = $den > 0 ? round(($num / $den) * 100, 1) : null;
            return [
                'code' => $code,
                'module_key' => $module,
                'title' => $title,
                'definition' => $definition,
                'unit' => '%',
                'numerator' => $num,
                'denominator' => $den,
                'value' => $val,
                'display_value' => $val === null ? 'non disponible' : "{$val} %",
                'computed_at' => now()->toIso8601String(),
            ];
        };

        return [
            $ratioMetric('CAPA_CLOSURE_RATE', 'qualite', 'Taux de clôture CAPA', 'Actions qualité clôturées / Total actions créées sur période', $capaClosed, $capaTotal),
            $ratioMetric('STOCK_CONFORMITY_RATE', 'stock', 'Conformité des lots actifs', 'Lots disponibles vendables / Total lots avec stock > 0', $lotsAvailable, $lotsActive),
            $ratioMetric('PHARMA_REVIEW_APPROVAL_RATE', 'dispensation', 'Taux de validation pharmaceutique', 'Analyses approuvées ou substituées / Total analyses', $reviewsApproved, $reviewsTotal),
            $ratioMetric('CASH_CLEAN_CLOSE_RATE', 'tresorerie', 'Clôtures de caisse sans écart', 'Sessions clôturées sans écart / Total sessions clôturées', $sessionsClean, $sessionsTotal),
            $ratioMetric('SUPPLIER_QUALIFIED_RATE', 'achats', 'Fournisseurs qualifiés BPD', 'Fournisseurs au statut qualifié / Total fournisseurs référencés', $suppliersQualified, $suppliersTotal),
            [
                'code' => 'CASH_RECEIPTS_TOTAL',
                'module_key' => 'tresorerie',
                'title' => 'Recettes encaissées confirmées',
                'definition' => 'Somme des encaissements confirmés sur la période',
                'unit' => 'FCFA',
                'numerator' => round($receiptsTotal, 2),
                'denominator' => 1,
                'value' => round($receiptsTotal, 2),
                'display_value' => number_format($receiptsTotal, 0, ',', ' ') . ' FCFA',
                'computed_at' => now()->toIso8601String(),
            ],
        ];
    }

    /**
     * Vue consolidée Tableaux de Bord & Rapports (CDC 6)
     */
    public function overview(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'reporting.read');
        $officineId = $this->getOfficineId($request);

        $periodStart = $request->query('period_start', Carbon::today()->subDays(30)->toDateString());
        $periodEnd = $request->query('period_end', Carbon::today()->toDateString());

        $metrics = $this->computeLiveMetrics($officineId, $periodStart, $periodEnd);

        return response()->json([
            'meta' => [
                'officine_id' => $officineId,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'as_of' => now()->toIso8601String(),
            ],
            'kpis' => [
                'templates_count' => ReportTemplate::where('officine_id', $officineId)->where('is_active', true)->count(),
                'runs_count' => ReportRun::where('officine_id', $officineId)->count(),
                'exports_count' => ReportExport::where('officine_id', $officineId)->count(),
                'failed_notifications' => NotificationJob::where('officine_id', $officineId)->where('status', 'echec')->count(),
            ],
            'metrics' => $metrics,
        ]);
    }

    // ==========================================
    // 1. DÉFINITIONS & PRÉFÉRENCES (CDC 3.1 & 3.2)
    // ==========================================

    public function metricsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'reporting.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => MetricDefinition::where('officine_id', $officineId)->where('is_validated', true)->orderBy('code')->get(),
        ]);
    }

    public function storeMetric(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'reporting.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:60',
            'module_key' => 'required|string|max:50',
            'title' => 'required|string|max:150',
            'definition' => 'required|string',
            'numerator_label' => 'required|string|max:150',
            'denominator_label' => 'nullable|string|max:150',
            'unit' => 'sometimes|string|in:%,unite,FCFA,score',
            'is_validated' => 'sometimes|boolean',
        ]);

        if (MetricDefinition::where('officine_id', $officineId)->where('code', $validated['code'])->exists()) {
            return response()->json(['message' => 'Ce code d’indicateur existe déjà.'], 422);
        }

        $metric = MetricDefinition::create([
            ...$validated,
            'officine_id' => $officineId,
            'unit' => $validated['unit'] ?? '%',
            'is_validated' => (bool) ($validated['is_validated'] ?? true),
            'is_active' => true,
            'version' => 1,
        ]);

        return response()->json(['data' => $metric], 201);
    }

    public function preferencesShow(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'reporting.read');
        $officineId = $this->getOfficineId($request);
        $userId = $request->user()?->id ?? 1;

        $pref = DashboardPreference::firstOrCreate(
            ['officine_id' => $officineId, 'user_id' => $userId],
            ['default_period' => '30d', 'pinned_modules' => ['qualite', 'stock', 'tresorerie'], 'pinned_metric_codes' => ['CAPA_CLOSURE_RATE', 'STOCK_CONFORMITY_RATE'], 'version' => 1]
        );

        return response()->json(['data' => $pref]);
    }

    public function savePreferences(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'reporting.write');
        $officineId = $this->getOfficineId($request);
        $userId = $request->user()?->id ?? 1;

        $validated = $request->validate([
            'default_period' => 'required|string|in:7d,30d,90d,ytd',
            'pinned_modules' => 'nullable|array',
            'pinned_metric_codes' => 'nullable|array',
        ]);

        $pref = DashboardPreference::where('officine_id', $officineId)
            ->where('user_id', $userId)
            ->first();

        if ($pref) {
            $pref->update([
                'default_period' => $validated['default_period'],
                'pinned_modules' => $validated['pinned_modules'] ?? [],
                'pinned_metric_codes' => $validated['pinned_metric_codes'] ?? [],
                'version' => $pref->version + 1,
            ]);
        } else {
            $pref = DashboardPreference::create([
                'officine_id' => $officineId,
                'user_id' => $userId,
                'default_period' => $validated['default_period'],
                'pinned_modules' => $validated['pinned_modules'] ?? [],
                'pinned_metric_codes' => $validated['pinned_metric_codes'] ?? [],
                'version' => 1,
            ]);
        }

        return response()->json(['data' => $pref->fresh()]);
    }

    // ==========================================
    // 2. MODÈLES & PLANIFICATION (CDC 3.4 & 3.5)
    // ==========================================

    public function templatesIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'reporting.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => ReportTemplate::where('officine_id', $officineId)->orderBy('title')->get(),
        ]);
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'reporting.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'title' => 'required|string|max:150',
            'category' => 'sometimes|string|in:smq_bpd,stock_fefo,ventes_caisse,fournisseurs,locaux',
            'description' => 'nullable|string',
            'metric_codes' => 'required|array|min:1',
            'default_format' => 'sometimes|string|in:csv,pdf,json',
            'is_scheduled' => 'sometimes|boolean',
            'cron_schedule' => 'nullable|string|max:50',
            'consent_confirmed' => 'sometimes|boolean',
            'recipients' => 'nullable|array',
        ]);

        // CDC 3.5 : Planifier uniquement si consentement métier établi et destinataires renseignés
        if (!empty($validated['is_scheduled'])) {
            if (empty($validated['consent_confirmed']) || empty($validated['recipients'])) {
                return response()->json(['message' => 'La planification automatique exige un consentement métier confirmé et des destinataires autorisés.'], 422);
            }
        }

        if (ReportTemplate::where('officine_id', $officineId)->where('code', $validated['code'])->exists()) {
            return response()->json(['message' => 'Ce code de modèle existe déjà.'], 422);
        }

        $tpl = ReportTemplate::create([
            ...$validated,
            'officine_id' => $officineId,
            'category' => $validated['category'] ?? 'smq_bpd',
            'default_format' => $validated['default_format'] ?? 'csv',
            'is_scheduled' => (bool) ($validated['is_scheduled'] ?? false),
            'consent_confirmed' => (bool) ($validated['consent_confirmed'] ?? false),
            'is_active' => true,
            'version' => 1,
        ]);

        return response()->json(['data' => $tpl], 201);
    }

    // ==========================================
    // 3. EXÉCUTIONS, COMPARAISONS & EXPORTS (CDC 3.3, 3.4 & 7)
    // ==========================================

    public function runsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'reporting.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => ReportRun::with(['template:id,code,title', 'exports', 'generatedBy:id,name'])
                ->where('officine_id', $officineId)
                ->orderByDesc('generated_at')
                ->get(),
        ]);
    }

    public function generateRun(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'reporting.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'template_id' => 'nullable|integer',
            'reference' => 'required|string|max:50',
            'title' => 'required|string|max:150',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'comparison_period_start' => 'nullable|date',
            'comparison_period_end' => 'nullable|date',
            'metric_codes' => 'nullable|array',
        ]);

        if (ReportRun::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de rapport existe déjà.'], 422);
        }

        if (!empty($validated['template_id']) && !ReportTemplate::where('officine_id', $officineId)->where('id', $validated['template_id'])->exists()) {
            return response()->json(['message' => 'Modèle de rapport introuvable dans cette officine.'], 404);
        }

        $metrics = $this->computeLiveMetrics($officineId, $validated['period_start'], $validated['period_end']);

        if (!empty($validated['metric_codes'])) {
            $codes = $validated['metric_codes'];
            $metrics = array_values(array_filter($metrics, fn ($m) => in_array($m['code'], $codes, true)));
        }

        $run = ReportRun::create([
            'officine_id' => $officineId,
            'template_id' => $validated['template_id'] ?? null,
            'reference' => $validated['reference'],
            'title' => $validated['title'],
            'period_start' => $validated['period_start'],
            'period_end' => $validated['period_end'],
            'comparison_period_start' => $validated['comparison_period_start'] ?? null,
            'comparison_period_end' => $validated['comparison_period_end'] ?? null,
            'computed_metrics' => $metrics,
            'status' => 'termine',
            'generated_by_user_id' => $request->user()?->id ?? 1,
            'generated_at' => now(),
            'version' => 1,
        ]);

        return response()->json(['data' => $run], 201);
    }

    /**
     * Comparaison inter-officines strictement restreinte aux officines autorisées (CDC 3.3 & 7)
     */
    public function compareOfficines(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'reporting.read');
        $officineId = $this->getOfficineId($request);
        $userId = $request->user()?->id;

        $validated = $request->validate([
            'compare_officine_id' => 'required|integer',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        $targetId = (int) $validated['compare_officine_id'];

        $hasTargetAccess = DB::table('officine_user')
            ->where('officine_id', $targetId)
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->exists();

        if (!$hasTargetAccess) {
            return response()->json(['message' => 'Accès refusé à l’officine de comparaison demandée.'], 403);
        }

        return response()->json([
            'period' => ['start' => $validated['period_start'], 'end' => $validated['period_end']],
            'primary' => [
                'officine_id' => $officineId,
                'metrics' => $this->computeLiveMetrics($officineId, $validated['period_start'], $validated['period_end']),
            ],
            'comparison' => [
                'officine_id' => $targetId,
                'metrics' => $this->computeLiveMetrics($targetId, $validated['period_start'], $validated['period_end']),
            ],
        ]);
    }

    public function exportRun(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'reporting.read');
        $officineId = $this->getOfficineId($request);

        $run = ReportRun::where('officine_id', $officineId)->find($id);
        if (!$run) {
            return response()->json(['message' => 'Exécution de rapport introuvable.'], 404);
        }

        $validated = $request->validate([
            'format' => 'sometimes|string|in:csv,pdf,json',
        ]);
        $format = $validated['format'] ?? 'csv';

        $lines = ["Code;Indicateur;Module;Numérateur;Dénominateur;Valeur;Unité"];
        foreach ($run->computed_metrics as $m) {
            $lines[] = implode(';', [
                $m['code'],
                str_replace(';', ',', $m['title']),
                $m['module_key'],
                $m['numerator'],
                $m['denominator'],
                $m['display_value'],
                $m['unit'],
            ]);
        }
        $csvContent = implode("\n", $lines);
        $checksum = hash('sha256', $csvContent);

        $export = ReportExport::create([
            'officine_id' => $officineId,
            'report_run_id' => $run->id,
            'export_ref' => 'EXP-' . $run->reference . '-' . strtoupper(substr($checksum, 0, 6)),
            'format' => $format,
            'row_count' => count($run->computed_metrics),
            'filtered_sensitive_fields' => true,
            'file_checksum_sha256' => $checksum,
            'exported_by_user_id' => $request->user()?->id ?? 1,
            'exported_at' => now(),
        ]);

        return response()->json([
            'data' => $export,
            'content' => $csvContent,
        ], 201);
    }

    // ==========================================
    // 4. NOTIFICATIONS PLANIFIÉES & REPRISE (CDC 3.5 & 5)
    // ==========================================

    public function notificationJobsIndex(Request $request): JsonResponse
    {
        $this->checkPermission($request, 'reporting.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => NotificationJob::with('template:id,code,title')
                ->where('officine_id', $officineId)
                ->orderByDesc('scheduled_for')
                ->get(),
        ]);
    }

    public function retryNotificationJob(Request $request, int $id): JsonResponse
    {
        $this->checkPermission($request, 'reporting.write');
        $officineId = $this->getOfficineId($request);

        $job = NotificationJob::where('officine_id', $officineId)->find($id);
        if (!$job) {
            return response()->json(['message' => 'Tâche de notification introuvable.'], 404);
        }

        $job->update([
            'status' => 'envoye',
            'attempts' => $job->attempts + 1,
            'last_error' => null,
            'sent_at' => now(),
        ]);

        return response()->json(['data' => $job]);
    }
}
