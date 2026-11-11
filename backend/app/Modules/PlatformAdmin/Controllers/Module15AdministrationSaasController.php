<?php

declare(strict_types=1);

namespace App\Modules\PlatformAdmin\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\PlatformAdmin\Models\AuditEvent;
use App\Modules\PlatformAdmin\Models\BillingEvent;
use App\Modules\PlatformAdmin\Models\Entitlement;
use App\Modules\PlatformAdmin\Models\Plan;
use App\Modules\PlatformAdmin\Models\PlanFeature;
use App\Modules\PlatformAdmin\Models\PlatformSetting;
use App\Modules\PlatformAdmin\Models\Subscription;
use App\Modules\PlatformAdmin\Models\SupportAccessRequest;
use App\Modules\PlatformAdmin\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Module15AdministrationSaasController extends Controller
{
    protected function getOfficineId(Request $request): int
    {
        $tenantId = app()->bound('tenant.officine_id') ? app('tenant.officine_id') : null;
        $headerId = $request->header('X-Officine-ID');
        return (int) ($tenantId ?? $headerId ?? 1);
    }

    protected function checkAdminOrPermission(Request $request, string $permission): void
    {
        $user = $request->user();
        if ($user && (bool) ($user->is_platform_admin ?? false)) {
            return;
        }
        $isAdmin = (bool) $request->attributes->get('officine.is_admin', false);
        if ($isAdmin) {
            return;
        }

        $perms = $request->attributes->get('officine.permissions', []);
        if (empty($perms)) {
            return;
        }

        abort_unless(
            in_array($permission, $perms, true) || in_array('admin', $perms, true),
            403,
            "Permission {$permission} requise."
        );
    }

    protected function logAudit(?int $officineId, ?int $actorId, string $eventType, ?string $targetType = null, ?int $targetId = null, array $metadata = []): void
    {
        AuditEvent::create([
            'officine_id' => $officineId,
            'actor_user_id' => $actorId,
            'event_type' => $eventType,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'metadata' => $metadata,
            'occurred_at' => now(),
        ]);
    }

    /**
     * Indicateurs consolidés Administration SaaS (CDC 6)
     */
    public function overview(Request $request): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.read');
        $officineId = $this->getOfficineId($request);

        $activePlans = Plan::where('is_active', true)->count();
        $totalSubs = Subscription::where('officine_id', $officineId)->count();
        $activeSubs = Subscription::where('officine_id', $officineId)->where('status', 'active')->count();
        $suspendedSubs = Subscription::where('officine_id', $officineId)->where('status', 'suspendue')->count();
        $openTickets = SupportTicket::where('officine_id', $officineId)->whereIn('status', ['ouvert', 'en_cours'])->count();
        $pendingAccess = SupportAccessRequest::where('officine_id', $officineId)->where('status', 'en_attente')->count();
        $auditCount = AuditEvent::where('officine_id', $officineId)->count();

        $activeRate = $totalSubs > 0 ? round(($activeSubs / $totalSubs) * 100, 1) : 'non disponible';

        return response()->json([
            'meta' => [
                'officine_id' => $officineId,
                'as_of' => now()->toIso8601String(),
                'period' => 'etat_courant',
            ],
            'kpis' => [
                'active_plans' => $activePlans,
                'total_subscriptions' => $totalSubs,
                'active_subscriptions' => $activeSubs,
                'suspended_subscriptions' => $suspendedSubs,
                'open_tickets' => $openTickets,
                'pending_access_requests' => $pendingAccess,
                'audit_events_count' => $auditCount,
                'subscription_active_rate' => $activeRate,
            ],
        ]);
    }

    // ==========================================
    // 1. FORFAITS & FEATURES (CDC 3.1 & 5)
    // ==========================================

    public function plansIndex(Request $request): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.read');

        return response()->json([
            'data' => Plan::with('features')->orderBy('name')->get(),
        ]);
    }

    public function storePlan(Request $request): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.write');

        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:120',
            'description' => 'nullable|string',
            'price_label' => 'nullable|string|max:80',
            'max_users' => 'nullable|integer|min:1',
            'features' => 'nullable|array',
            'features.*.module_key' => 'required_with:features|string|max:50',
            'features.*.feature_label' => 'required_with:features|string|max:150',
            'features.*.limit_value' => 'nullable|integer|min:1',
        ]);

        if (Plan::where('code', $validated['code'])->exists()) {
            return response()->json(['message' => 'Ce code de forfait existe déjà.'], 422);
        }

        return DB::transaction(function () use ($validated, $request) {
            $plan = Plan::create([
                'code' => strtoupper($validated['code']),
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'price_label' => $validated['price_label'] ?? null,
                'max_users' => $validated['max_users'] ?? null,
                'is_active' => true,
                'version' => 1,
            ]);

            if (!empty($validated['features'])) {
                foreach ($validated['features'] as $f) {
                    PlanFeature::create([
                        'plan_id' => $plan->id,
                        'module_key' => $f['module_key'],
                        'feature_label' => $f['feature_label'],
                        'is_included' => true,
                        'limit_value' => $f['limit_value'] ?? null,
                    ]);
                }
            }

            $this->logAudit(null, $request->user()?->id, 'plan.created', 'plan', $plan->id, ['code' => $plan->code]);
            return response()->json(['data' => $plan->load('features')], 201);
        });
    }

    // ==========================================
    // 2. SOUSCRIPTIONS, WEBHOOKS & SUSPENSION (CDC 3.2, 3.6 & 7)
    // ==========================================

    public function subscriptionsIndex(Request $request): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => Subscription::with(['plan.features', 'entitlements'])
                ->where('officine_id', $officineId)
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function storeSubscription(Request $request): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'plan_id' => 'required|integer',
            'reference' => 'required|string|max:50',
        ]);

        $plan = Plan::with('features')->find($validated['plan_id']);
        if (!$plan) {
            return response()->json(['message' => 'Forfait introuvable.'], 404);
        }

        if (Subscription::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de souscription existe déjà.'], 422);
        }

        $sub = Subscription::create([
            'officine_id' => $officineId,
            'plan_id' => $plan->id,
            'reference' => $validated['reference'],
            'status' => 'en_attente_paiement',
            'data_retained' => true,
            'version' => 1,
        ]);

        $this->logAudit($officineId, $request->user()?->id, 'subscription.created', 'subscription', $sub->id, ['plan_code' => $plan->code]);
        return response()->json(['data' => $sub->load('plan.features')], 201);
    }

    /**
     * Webhook paiement vérifié & idempotent (CDC 3.2 & 7 : rejeu sans doublon)
     */
    public function billingWebhook(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'officine_id' => 'required|integer',
            'subscription_id' => 'required|integer',
            'provider_name' => 'required|string|max:60',
            'provider_event_id' => 'required|string|max:120',
            'event_type' => 'required|string|in:payment_confirmed,payment_failed,subscription_renewed',
            'amount' => 'nullable|numeric|min:0',
            'currency' => 'sometimes|string|max:10',
        ]);

        return DB::transaction(function () use ($validated) {
            $existing = BillingEvent::where('provider_name', $validated['provider_name'])
                ->where('provider_event_id', $validated['provider_event_id'])
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return response()->json(['data' => $existing, 'replayed' => true], 200);
            }

            $sub = Subscription::with('plan.features')
                ->where('officine_id', $validated['officine_id'])
                ->lockForUpdate()
                ->find($validated['subscription_id']);
            if (!$sub) {
                return response()->json(['message' => 'Souscription introuvable pour cette officine.'], 404);
            }

            $event = BillingEvent::create([
                'officine_id' => $validated['officine_id'],
                'subscription_id' => $sub->id,
                'provider_name' => $validated['provider_name'],
                'provider_event_id' => $validated['provider_event_id'],
                'event_type' => $validated['event_type'],
                'amount' => $validated['amount'] ?? null,
                'currency' => $validated['currency'] ?? 'XOF',
                'status' => 'traite',
                'occurred_at' => now(),
            ]);

            if (in_array($validated['event_type'], ['payment_confirmed', 'subscription_renewed'], true)) {
                $sub->update([
                    'status' => 'active',
                    'started_at' => $sub->started_at ?? now(),
                    'version' => $sub->version + 1,
                ]);

                foreach ($sub->plan->features as $f) {
                    $ent = Entitlement::where('officine_id', $sub->officine_id)
                        ->where('module_key', $f->module_key)
                        ->first();
                    if ($ent) {
                        $ent->update([
                            'subscription_id' => $sub->id,
                            'is_enabled' => $f->is_included,
                            'quota_limit' => $f->limit_value,
                            'version' => $ent->version + 1,
                        ]);
                    } else {
                        Entitlement::create([
                            'officine_id' => $sub->officine_id,
                            'module_key' => $f->module_key,
                            'subscription_id' => $sub->id,
                            'is_enabled' => $f->is_included,
                            'quota_limit' => $f->limit_value,
                            'version' => 1,
                        ]);
                    }
                }
            }

            $this->logAudit($sub->officine_id, null, 'billing.webhook.' . $validated['event_type'], 'subscription', $sub->id, ['event_id' => $event->id]);
            return response()->json(['data' => $event, 'replayed' => false], 201);
        });
    }

    public function suspendSubscription(Request $request, int $id): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'action' => 'required|string|in:suspendre,reactiver',
            'reason' => 'required|string|min:5',
        ]);

        return DB::transaction(function () use ($officineId, $id, $validated, $request) {
            $sub = Subscription::where('officine_id', $officineId)->lockForUpdate()->find($id);
            if (!$sub) {
                return response()->json(['message' => 'Souscription introuvable.'], 404);
            }

            $isSuspend = $validated['action'] === 'suspendre';

            // CDC 3.6 & 7 : suspension conserve toutes les données (data_retained = true)
            $sub->update([
                'status' => $isSuspend ? 'suspendue' : 'active',
                'suspension_reason' => $isSuspend ? $validated['reason'] : null,
                'data_retained' => true,
                'version' => $sub->version + 1,
            ]);

            Entitlement::where('officine_id', $officineId)
                ->where('subscription_id', $sub->id)
                ->update(['is_enabled' => !$isSuspend]);

            $this->logAudit($officineId, $request->user()?->id, $isSuspend ? 'subscription.suspended' : 'subscription.reactivated', 'subscription', $sub->id, [
                'reason' => $validated['reason'],
                'data_retained' => true,
            ]);

            return response()->json(['data' => $sub->load('entitlements')]);
        });
    }

    // ==========================================
    // 3. ASSISTANCE & ACCÈS SUPPORT APPROUVÉS (CDC 3.4 & 7)
    // ==========================================

    public function ticketsIndex(Request $request): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => SupportTicket::with(['openedBy:id,name', 'accessRequests.requester:id,name'])
                ->where('officine_id', $officineId)
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function storeTicket(Request $request): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'reference' => 'required|string|max:50',
            'subject' => 'required|string|max:150',
            'description' => 'required|string',
            'priority' => 'sometimes|string|in:basse,normale,haute,critique',
        ]);

        if (SupportTicket::where('officine_id', $officineId)->where('reference', $validated['reference'])->exists()) {
            return response()->json(['message' => 'Cette référence de ticket existe déjà.'], 422);
        }

        $ticket = SupportTicket::create([
            'officine_id' => $officineId,
            'reference' => $validated['reference'],
            'subject' => $validated['subject'],
            'description' => $validated['description'],
            'priority' => $validated['priority'] ?? 'normale',
            'status' => 'ouvert',
            'opened_by_user_id' => $request->user()?->id ?? 1,
            'version' => 1,
        ]);

        $this->logAudit($officineId, $request->user()?->id, 'support_ticket.created', 'support_ticket', $ticket->id);
        return response()->json(['data' => $ticket], 201);
    }

    public function accessRequestsIndex(Request $request): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => SupportAccessRequest::with(['requester:id,name,email', 'approvedBy:id,name', 'ticket:id,reference,subject'])
                ->where('officine_id', $officineId)
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function storeAccessRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'officine_id' => 'required|integer',
            'ticket_id' => 'nullable|integer',
            'reason' => 'required|string|min:5',
            'requested_scope' => 'required|array|min:1',
            'duration_hours' => 'sometimes|integer|min:1|max:72',
        ]);

        $req = SupportAccessRequest::create([
            'officine_id' => $validated['officine_id'],
            'ticket_id' => $validated['ticket_id'] ?? null,
            'requester_user_id' => $request->user()->id,
            'reason' => $validated['reason'],
            'requested_scope' => $validated['requested_scope'],
            'duration_hours' => $validated['duration_hours'] ?? 4,
            'status' => 'en_attente',
            'version' => 1,
        ]);

        $this->logAudit($validated['officine_id'], $request->user()->id, 'support_access.requested', 'support_access_request', $req->id, ['scope' => $validated['requested_scope']]);
        return response()->json(['data' => $req], 201);
    }

    public function decideAccessRequest(Request $request, int $id): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.write');
        $officineId = $this->getOfficineId($request);

        $validated = $request->validate([
            'decision' => 'required|string|in:approuve,refuse,revoque',
        ]);

        $acc = SupportAccessRequest::where('officine_id', $officineId)->find($id);
        if (!$acc) {
            return response()->json(['message' => 'Demande d’accès support introuvable.'], 404);
        }

        $decision = $validated['decision'];
        $acc->update([
            'status' => $decision,
            'approved_by_user_id' => $decision === 'approuve' ? $request->user()?->id : $acc->approved_by_user_id,
            'approved_at' => $decision === 'approuve' ? now() : $acc->approved_at,
            'expires_at' => $decision === 'approuve' ? now()->addHours($acc->duration_hours) : $acc->expires_at,
            'revoked_at' => $decision === 'revoque' ? now() : null,
            'version' => $acc->version + 1,
        ]);

        $this->logAudit($officineId, $request->user()?->id, 'support_access.' . $decision, 'support_access_request', $acc->id);
        return response()->json(['data' => $acc]);
    }

    /**
     * Lecture de diagnostic support (CDC 7 : un agent sans accès approuvé ne lit aucune donnée métier)
     */
    public function supportReadWorkspace(Request $request, int $officineId): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $isMember = DB::table('officine_user')
            ->where('officine_id', $officineId)
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->exists();

        if (!$isMember) {
            $hasApprovedAccess = SupportAccessRequest::where('officine_id', $officineId)
                ->where('requester_user_id', $user->id)
                ->where('status', 'approuve')
                ->whereNull('revoked_at')
                ->where('expires_at', '>', now())
                ->exists();

            abort_unless($hasApprovedAccess, 403, 'Accès support temporaire approuvé par l’officine requis.');
        }

        $this->logAudit($officineId, $user->id, 'support_workspace.read', 'officine', $officineId);

        return response()->json([
            'officine_id' => $officineId,
            'products_count' => DB::table('products')->where('officine_id', $officineId)->count(),
            'open_tickets' => SupportTicket::where('officine_id', $officineId)->where('status', 'ouvert')->count(),
            'access_granted' => true,
        ]);
    }

    // ==========================================
    // 4. PARAMÈTRES & JOURNAL D'AUDIT (CDC 3.5)
    // ==========================================

    public function settingsIndex(Request $request): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.read');
        $officineId = $request->query('scope') === 'global' ? null : $this->getOfficineId($request);

        return response()->json([
            'data' => PlatformSetting::where('officine_id', $officineId)->orderBy('setting_key')->get(),
        ]);
    }

    public function saveSetting(Request $request): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.write');
        $officineId = $request->input('scope') === 'global' ? null : $this->getOfficineId($request);

        $validated = $request->validate([
            'setting_key' => 'required|string|max:80',
            'setting_value' => 'required|array',
        ]);

        $setting = PlatformSetting::where('officine_id', $officineId)
            ->where('setting_key', $validated['setting_key'])
            ->first();

        if ($setting) {
            $setting->update([
                'setting_value' => $validated['setting_value'],
                'updated_by_user_id' => $request->user()?->id,
                'version' => $setting->version + 1,
            ]);
        } else {
            $setting = PlatformSetting::create([
                'officine_id' => $officineId,
                'setting_key' => $validated['setting_key'],
                'setting_value' => $validated['setting_value'],
                'updated_by_user_id' => $request->user()?->id,
                'version' => 1,
            ]);
        }

        $this->logAudit($officineId, $request->user()?->id, 'setting.updated', 'platform_setting', $setting->id, ['key' => $validated['setting_key']]);
        return response()->json(['data' => $setting->fresh()]);
    }

    public function auditEventsIndex(Request $request): JsonResponse
    {
        $this->checkAdminOrPermission($request, 'platformadmin.read');
        $officineId = $this->getOfficineId($request);

        return response()->json([
            'data' => AuditEvent::with('actor:id,name')
                ->where('officine_id', $officineId)
                ->orderByDesc('occurred_at')
                ->limit(150)
                ->get(),
        ]);
    }
}
