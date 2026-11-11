<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Presents the verified availability of the BPD self-assessment workflow.
 * A campaign is deliberately not synthesized from the legacy demo checklist:
 * the target has no validated, versioned reference catalog yet.
 */
class AutoEvaluationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(in_array('qualite.read', $request->attributes->get('officine.permissions', []), true), 403);

        // Return a stable empty state until Qualité owns a validated reference and
        // recorded measures. Do not infer a score or regulatory interpretation.
        $hasReference = DB::getSchemaBuilder()->hasTable('qualite_referentiel_versions')
            && DB::table('qualite_referentiel_versions')->where('status', 'validated')->exists();
        $hasCampaignTable = DB::getSchemaBuilder()->hasTable('qualite_auto_evaluation_campaigns');
        $campaignCount = $hasCampaignTable
            ? DB::table('qualite_auto_evaluation_campaigns')->where('officine_id', app('tenant.officine_id'))->count()
            : 0;
        $available = $hasReference && $campaignCount > 0;

        return response()->json([
            'status' => $available ? 'available' : ($hasReference ? 'no_campaign' : 'not_available'),
            'available' => $available,
            'reason' => $available ? null : ($hasReference
                ? 'Aucune campagne ni mesure enregistrée.'
                : 'Aucun référentiel BPD validé et versionné n’est disponible dans cette application.'),
            'campaigns' => [],
            'measurements' => [],
            'reports' => [],
            'capa_links' => [],
            'scoring' => null,
        ]);
    }
}
