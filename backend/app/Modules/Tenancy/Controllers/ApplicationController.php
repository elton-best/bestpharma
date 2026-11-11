<?php

declare(strict_types=1);
namespace App\Modules\Tenancy\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class ApplicationController extends Controller
{
    public static function rules(): array
    {
        return [
            'officine_name' => ['required', 'string', 'max:180', 'regex:/\S/u'],
            'phone' => ['required', 'string', 'max:40', 'regex:/^[+0-9 ()-]{6,40}$/'],
            'city' => ['required', 'string', 'max:120', 'regex:/\S/u'],
            'address' => ['required', 'string', 'max:500', 'regex:/\S/u'],
            'applicant_function' => ['required', 'string', 'max:120', 'regex:/\S/u'],
            'consent' => ['accepted'],
            'status' => ['prohibited'], 'permissions' => ['prohibited'], 'is_platform_admin' => ['prohibited'],
        ];
    }

    public function register(Request $request): JsonResponse
    {
        if (is_string($request->input('email'))) {
            $request->merge(['email' => strtolower(trim($request->input('email')))]);
        }
        $data = $request->validate(array_merge(self::rules(), [
            'name' => ['required', 'string', 'max:120', 'regex:/\S/u'],
            'email' => ['required', 'email', 'max:254', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers(), 'max:128'],
        ]));
        return DB::transaction(function () use ($data) {
            $user = User::create(['name' => $data['name'], 'email' => $data['email'], 'password' => $data['password']]);
            $id = DB::table('officines')->insertGetId([
                'name' => $data['officine_name'], 'slug' => Str::slug($data['officine_name']).'-'.Str::uuid(),
                'email' => $data['email'], 'phone' => $data['phone'], 'city' => $data['city'], 'address' => $data['address'],
                'applicant_function' => $data['applicant_function'], 'applicant_user_id' => $user->id,
                'status' => 'draft', 'contact_name'=>$data['name'], 'devise' => 'XOF', 'submitted_at' => null, 'created_at' => now(), 'updated_at' => now(),
            ]);
            // Applicant membership grants no business permissions before BEG activation.
            DB::table('officine_user')->insert(['officine_id' => $id, 'user_id' => $user->id, 'permissions' => '[]', 'created_at' => now(), 'updated_at' => now()]);
            DB::table('tenant_audit_logs')->insert(['officine_id' => $id, 'user_id' => $user->id, 'action' => 'application.draft.created', 'payload' => json_encode(['attestation_accepted' => true, 'attestation_version' => '2026-11-10']), 'created_at' => now(), 'updated_at' => now()]);
            \App\Modules\Identity\Services\IdentitySecurity::email($user);
            return response()->json(['token' => $user->createToken('applicant', ['*'], now()->addHours(8))->plainTextToken, 'application_id' => $id], 201)->header('Cache-Control', 'no-store');
        });
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => DB::table('officines')->where('applicant_user_id', $request->user()->id)
            ->select('id', 'name', 'email', 'phone', 'city', 'address', 'applicant_function', 'status', 'review_note', 'submitted_at', 'reviewed_at','country','department','contact_name','district','neighborhood','latitude','longitude','application_version')->orderByDesc('id')->get()]);
    }

    public function resubmit(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(self::rules()+['version'=>['required','integer','min:1']]);
        DB::transaction(function () use ($request, $id, $data) {
            $officine = DB::table('officines')->where('id', $id)->where('applicant_user_id', $request->user()->id)->lockForUpdate()->first();
            abort_unless($officine, 404);
            abort_unless($request->user()->email_verified_at,403,'Vérifiez votre email.');
            abort_unless($officine->application_version===(int)$data['version'],409,'Version périmée.');
            abort_unless($officine->status === 'corrections_requested', 409, 'Ce dossier ne peut pas être modifié dans cet état.');
            DB::table('officines')->where('id', $id)->update([
                'name' => $data['officine_name'], 'phone' => $data['phone'], 'city' => $data['city'], 'address' => $data['address'],
                'applicant_function' => $data['applicant_function'], 'application_version'=>$officine->application_version+1,'status' => 'pending', 'submitted_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('tenant_audit_logs')->insert(['officine_id' => $id, 'user_id' => $request->user()->id, 'action' => 'application.resubmitted','payload'=>json_encode(['version'=>$officine->application_version+1]), 'created_at' => now(), 'updated_at' => now()]);
            foreach(DB::table('users')->where('is_platform_admin',true)->where('is_active',true)->pluck('id')->push($request->user()->id)->unique() as $recipient)\App\Modules\Identity\Services\Outbox::push($recipient,'application-resubmitted:'.$id.':'.($officine->application_version+1).':'.$recipient,'Dossier soumis à nouveau','Une nouvelle version est disponible dans votre espace autorisé.',(int)$id);
        });
        return response()->json(['message' => 'Dossier soumis à nouveau.']);
    }
}
