<?php

declare(strict_types=1);
namespace App\Modules\PlatformAdmin\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ApplicationReviewController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        // Not fillable on User and never accepted through public registration.
        abort_unless((bool) $request->user()->is_platform_admin, 403);
    }
    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        return response()->json(['data' => DB::table('officines')->whereNotNull('applicant_user_id')->where('status','!=','draft')
            ->select('id', 'name', 'email', 'phone', 'city', 'address', 'applicant_function', 'status', 'review_note', 'submitted_at', 'reviewed_at','application_version','reviewer_id','country','department','contact_name','district','neighborhood','latitude','longitude')
            ->orderByDesc('submitted_at')->limit(200)->get()]);
    }
    public function update(Request $request, string $id): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'habilitation_confirmed'=>['required_if:decision,active','accepted_if:decision,active'],
            'version'=>['required','integer','min:1'],
            'decision' => ['required', Rule::in(['under_review', 'corrections_requested', 'active', 'rejected'])],
            'note' => ['nullable', 'required_if:decision,corrections_requested,rejected', 'string', 'max:2000', 'regex:/\S/u'],
        ]);
        DB::transaction(function () use ($request, $data, $id) {
            $officine = DB::table('officines')->where('id', $id)->whereNotNull('applicant_user_id')->lockForUpdate()->first();
            abort_unless($officine, 404);
            abort_if($officine->applicant_user_id===$request->user()->id,403,'Vous ne pouvez pas instruire votre propre dossier.');
            abort_unless($officine->application_version===(int)$data['version'],409,'Version périmée. Rechargez le dossier.');
            abort_if($officine->reviewer_id && $officine->status==='under_review' && $officine->reviewer_id!==$request->user()->id,409,'Dossier pris en charge par un autre instructeur.');
            $allowed = ['pending' => ['under_review'], 'under_review' => ['corrections_requested', 'active', 'rejected']];
            abort_unless(in_array($data['decision'], $allowed[$officine->status] ?? [], true), 409, 'Transition non autorisée. Rechargez le dossier.');
            if ($data['decision'] === 'active') {
                abort_unless(DB::table('users')->where('id',$officine->applicant_user_id)->whereNotNull('email_verified_at')->where('is_active',true)->exists(),409,'Le demandeur doit avoir un compte actif et un email vérifié.');
                DB::table('officine_user')->where('officine_id', $id)->where('user_id', $officine->applicant_user_id)
                    ->update(['is_admin' => true, 'permissions' => json_encode(['qualite.read', 'qualite.write']), 'updated_at' => now()]);
                DB::table('officine_modules')->updateOrInsert(['officine_id' => $id, 'module' => 'qualite'], ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
            }
            DB::table('officines')->where('id', $id)->update(['application_version'=>$officine->application_version+1,'reviewer_id'=>$request->user()->id,'status' => $data['decision'], 'review_note' => $data['note'] ?? null, 'reviewed_at' => now(), 'updated_at' => now()]);
            DB::table('tenant_audit_logs')->insert(['officine_id' => $id, 'user_id' => $request->user()->id, 'action' => 'application.'.$data['decision'], 'payload' => json_encode(['habilitation_confirmed'=>$data['decision']==='active'?true:null,'version'=>$officine->application_version+1,'from' => $officine->status, 'to' => $data['decision'], 'note' => $data['note'] ?? null]), 'created_at' => now(), 'updated_at' => now()]);
            DB::table('application_comments')->insert(['officine_id'=>$id,'user_id'=>$request->user()->id,'is_internal'=>false,'message'=>'Décision : '.$data['decision'].(($data['note']??null)?' — '.$data['note']:''),'created_at'=>now(),'updated_at'=>now()]);
            \App\Modules\Identity\Services\Outbox::push($officine->applicant_user_id,'application-decision:'.$id.':'.($officine->application_version+1),'Mise à jour du dossier','Votre dossier a changé d’état : '.$data['decision'].'. Consultez votre suivi pour les détails.',(int)$id);
        });
        return response()->json(['message' => 'Décision enregistrée.']);
    }
}
