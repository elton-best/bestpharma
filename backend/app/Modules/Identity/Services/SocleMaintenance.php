<?php
declare(strict_types=1);
namespace App\Modules\Identity\Services;
use Illuminate\Support\Facades\DB;

/** No business record or audit deletion. Reminder keys remain durable in the outbox. */
class SocleMaintenance
{
    public static function remind(): array
    {
        $counts = ['applications' => 0, 'support' => 0];
        $days = max(1, (int) config('socle.reminder_days', 3));
        DB::table('officines')->whereIn('status', ['pending', 'under_review', 'corrections_requested'])
            ->where('updated_at', '<=', now()->subDays($days))->orderBy('id')->chunkById(100, function ($rows) use (&$counts) {
                foreach ($rows as $row) {
                    DB::transaction(function () use ($row, &$counts) {
                        $o = DB::table('officines')->where('id', $row->id)->lockForUpdate()->first();
                        if (!$o || $o->status !== $row->status || $o->application_version !== $row->application_version) return;
                        $key = 'reminder:application:'.$o->id.':'.$o->application_version;
                        if ($o->status === 'corrections_requested') {
                            $recipients = DB::table('users')->where('id', $o->applicant_user_id)->where('is_active', true)->pluck('id');
                        } else {
                            $recipients = DB::table('users')->where('is_platform_admin', true)->where('is_active', true)
                                ->when($o->reviewer_id, fn ($q) => $q->where('id', $o->reviewer_id))->pluck('id');
                        }
                        foreach ($recipients as $id) {
                            Outbox::push($id, $key.':'.$id, 'Rappel : dossier en attente', 'Un dossier attend votre intervention dans votre espace autorisé.', $o->id);
                        }
                        $counts['applications']++;
                    });
                }
            });
        DB::table('officine_support_assignments')->where('status', 'pending')
            ->where('created_at', '<=', now()->subDays($days))
            ->where('created_at', '>', now()->subDays(max(1, (int) config('socle.support_pending_days', 14))))
            ->where('ends_on', '>=', now('Africa/Porto-Novo')->toDateString())
            ->orderBy('id')->chunkById(100, function ($rows) use (&$counts) {
                foreach ($rows as $row) {
                    DB::transaction(function () use ($row, &$counts) {
                        $a = DB::table('officine_support_assignments')->where('id', $row->id)->lockForUpdate()->first();
                        if (!$a || $a->status !== 'pending' || $a->version !== $row->version) return;
                        if (!DB::table('officines')->where('id', $a->officine_id)->where('status', 'active')->exists()) return;
                        Outbox::office($a->officine_id, 'reminder:support:'.$a->id.':'.$a->version,
                            'Rappel : proposition d’accompagnement', 'Une proposition attend votre décision. Aucun accès n’est accordé avant approbation.');
                        $counts['support']++;
                    });
                }
            });
        return $counts;
    }

    public static function prune(bool $apply = false): array
    {
        // Small operational retention, not a regulatory/business retention policy.
        $cutoff = now()->subDays(max(1, (int) config('socle.expired_token_retention_days', 7)));
        $tokens = DB::table('identity_tokens')->where('expires_at', '<', $cutoff);
        $sessions = DB::table('personal_access_tokens')->whereNotNull('expires_at')->where('expires_at', '<', $cutoff);
        $counts = ['identity_tokens' => $tokens->count(), 'sessions' => $sessions->count(), 'applied' => $apply];
        if ($apply) { $tokens->delete(); $sessions->delete(); }
        return $counts;
    }
}
