<?php

namespace App\Modules\Accompagnement\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Accompagnement\Services\MissionAccess as Access;
use App\Modules\Identity\Services\Outbox;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MissionCommentController extends Controller
{
    private function mission(Request $request, string $id): array
    {
        $office = (int) app('tenant.officine_id');
        Access::lockOffice($request, $office);
        $mission = DB::table('support_missions as m')
            ->join('support_requests as r', 'r.id', '=', 'm.support_request_id')
            ->where('r.officine_id', $office)->where('m.id', $id)->select('m.*')->first();
        abort_unless($mission && Access::allowed($request, $office, (int) $mission->id), 404);
        return [$office, $mission];
    }

    public function index(Request $request, string $id): JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            [, $mission] = $this->mission($request, $id);
            $canLead = Access::allowed($request, (int) app('tenant.officine_id'), (int) $mission->id, true, true);
            $rows = DB::table('support_mission_comments as c')->join('users as u', 'u.id', '=', 'c.user_id')
                ->where('c.mission_id', $mission->id)->when(!$canLead, fn ($query) => $query->where('c.visibility', 'shared'))
                ->orderBy('c.id')->get(['c.id', 'c.user_id', 'u.name as author', 'c.visibility', 'c.message', 'c.shared_at', 'c.created_at']);
            return response()->json(['data' => $rows, 'can_lead' => $canLead,
                'can_comment' => in_array($mission->status, ['active', 'suspended'], true)]);
        })->header('Cache-Control', 'no-store');
    }

    public function create(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['visibility' => ['required', 'in:shared,internal'],
            'message' => ['required', 'string', 'max:5000', 'regex:/\\S/u'],
            'request_key' => ['required', 'string', 'min:16', 'max:80', 'regex:/^[A-Za-z0-9-]+$/'], 'confirmed' => ['required', 'accepted']]);
        return DB::transaction(function () use ($request, $id, $data) {
            [$office, $mission] = $this->mission($request, $id);
            $lead = Access::allowed($request, $office, (int) $mission->id, true, true);
            abort_if($data['visibility'] === 'internal' && !$lead, 403, 'Seul le responsable approuvé peut publier une note interne.');
            $fingerprint = hash('sha256', json_encode([$request->user()->id, $data['visibility'], trim($data['message'])]));
            $existing = DB::table('support_mission_comments')->where('mission_id', $mission->id)->where('request_key', $data['request_key'])->first();
            if ($existing) {
                abort_unless(hash_equals($existing->fingerprint, $fingerprint), 409, 'Cette clé de publication a déjà été utilisée.');
                return response()->json(['data' => $this->row($existing->id)], 200);
            }
            abort_unless(in_array($mission->status, ['active', 'suspended'], true), 409, 'La mission n’accepte plus de nouveaux échanges.');
            $id = DB::table('support_mission_comments')->insertGetId([
                'mission_id' => $mission->id, 'user_id' => $request->user()->id,
                'visibility' => $data['visibility'], 'message' => trim($data['message']),
                'request_key' => $data['request_key'], 'fingerprint' => $fingerprint,
                'shared_at' => $data['visibility'] === 'shared' ? now() : null, 'created_at' => now(), 'updated_at' => now(),
            ]);
            if ($data['visibility'] === 'shared') {
                Access::event($request, $mission, $office, 'comment_shared', 'Un message partagé a été ajouté à la mission.');
                Outbox::office($office, 'mission-comment:'.$id, 'Nouveau message sur une mission', 'Un message partagé est disponible dans votre espace autorisé.');
            }
            $row = $this->row($id);
            return response()->json(['data' => $row], 201);
        });
    }

    private function row(int $id): object
    {
        return DB::table('support_mission_comments as c')->join('users as u', 'u.id', '=', 'c.user_id')
            ->where('c.id', $id)->first(['c.id', 'c.user_id', 'u.name as author', 'c.visibility', 'c.message', 'c.shared_at', 'c.created_at']);
    }
}
