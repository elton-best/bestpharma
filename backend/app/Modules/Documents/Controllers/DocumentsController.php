<?php
declare(strict_types=1);
namespace App\Modules\Documents\Controllers;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Modules\Documents\Models\Document;
use App\Modules\Documents\Services\DocumentsService;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
class DocumentsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->permission($request, 'documents.read');
        return response()->json(['data' => Document::query()->where('status', '!=', 'archived')->latest()->paginate(25)]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->permission($request, 'documents.write');
        $data = $request->validate(['title'=>'required|string|max:255','kind'=>'required|in:procedure,mop,form,record','process'=>'nullable|string|max:80','content'=>'nullable|string|max:100000']);
        $content = $data['content'] ?? '';
        $doc = new Document($data + ['status'=>'draft','content'=>$content,'sha256'=>app(DocumentsService::class)->fingerprint($content),'created_by'=>$request->user()->id]);
        $doc->save();
        $this->audit($request, $doc, 'created');
        return response()->json(['data'=>$doc], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->permission($request, 'documents.write');
        $data = $request->validate(['version'=>'required|integer|min:1','title'=>'required|string|max:255','process'=>'nullable|string|max:80','content'=>'nullable|string|max:100000']);
        return DB::transaction(function () use ($request, $id, $data) {
            $doc = Document::query()->lockForUpdate()->findOrFail($id);
            abort_unless($doc->version === $data['version'], 409, 'La version a changé. Rechargez le document.');
            abort_unless($doc->status === 'draft', 409, 'Une version soumise ou approuvée est immuable. Créez une révision.');
            $doc->title=$data['title']; $doc->process=$data['process'] ?? null; $doc->content=$data['content'] ?? '';
            $doc->sha256=app(DocumentsService::class)->fingerprint($doc->content); $doc->save();
            $this->audit($request, $doc, 'updated');
            return response()->json(['data'=>$doc]);
        });
    }

    public function submit(Request $request, int $id): JsonResponse
    {
        $this->permission($request, 'documents.write');
        $data=$request->validate(['version'=>'required|integer|min:1']);
        $doc=Document::query()->findOrFail($id); abort_unless($doc->version===$data['version'],409);
        abort_unless($doc->status==='draft',409); $doc->status='pending'; $doc->save();
        $this->audit($request, $doc, 'submitted');
        return response()->json(['data'=>$doc]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $this->permission($request, 'documents.approve');
        $data=$request->validate(['version'=>'required|integer|min:1','password'=>'required|string','sha256'=>'required|regex:/^[a-f0-9]{64}$/']);
        abort_unless(Hash::check($data['password'], $request->user()->password), 422, 'Confirmation du mot de passe invalide.');
        return DB::transaction(function () use ($request,$id,$data) {
            $doc=Document::query()->lockForUpdate()->findOrFail($id);
            abort_unless($doc->version===$data['version'] && $doc->status==='pending' && hash_equals($doc->sha256,$data['sha256']),409,'La version soumise a changé.');
            $tenant=(int)app('tenant.officine_id');
            DB::table('document_approvals')->insert(['officine_id'=>$tenant,'document_id'=>$doc->id,'version'=>$doc->version,'approved_by'=>$request->user()->id,'sha256'=>$doc->sha256,'approved_at'=>now()]);
            $doc->status='approved'; $doc->save(); $this->audit($request, $doc, 'approved'); return response()->json(['data'=>$doc]);
        });
    }

    public function revise(Request $request, int $id): JsonResponse
    {
        $this->permission($request, 'documents.write');
        $data=$request->validate(['version'=>'required|integer|min:1']);
        $source=Document::query()->findOrFail($id); abort_unless($source->version===$data['version'] && $source->status==='approved',409);
        $new=$source->replicate(); $new->version=$source->version+1; $new->status='draft'; $new->created_by=$request->user()->id; $new->sha256=app(DocumentsService::class)->fingerprint($new->content); $new->save();
        $this->audit($request, $new, 'revision_created');
        return response()->json(['data'=>$new],201);
    }

    public function upload(Request $request, int $id): JsonResponse
    {
        $this->permission($request, 'documents.write');
        $data=$request->validate(['version'=>'required|integer|min:1','file'=>'required|file|max:20480|mimes:pdf,doc,docx,xls,xlsx,odt,jpg,jpeg,png']);
        $doc=Document::query()->findOrFail($id); abort_unless($doc->version===$data['version'] && $doc->status==='draft',409);
        $f=$data['file']; $hash=hash_file('sha256',$f->getRealPath()); $key=app('tenant.officine_id').'/'.$doc->id.'/'.Str::uuid();
        Storage::disk('local')->put($key, fopen($f->getRealPath(),'rb'));
        $attachment=DB::table('document_attachments')->insertGetId(['officine_id'=>app('tenant.officine_id'),'document_id'=>$doc->id,'version'=>$doc->version,'name'=>basename($f->getClientOriginalName()),'path'=>$key,'mime'=>$f->getMimeType(),'bytes'=>$f->getSize(),'sha256'=>$hash,'uploaded_by'=>$request->user()->id,'created_at'=>now(),'updated_at'=>now()]);
        $this->audit($request, $doc, 'attachment_added');
        return response()->json(['id'=>$attachment,'name'=>basename($f->getClientOriginalName()),'sha256'=>$hash],201);
    }

    public function download(Request $request, int $id, int $attachmentId): BinaryFileResponse
    {
        $this->permission($request, 'documents.read');
        $doc=Document::query()->findOrFail($id);
        $file=DB::table('document_attachments')->where('officine_id',app('tenant.officine_id'))->where('document_id',$doc->id)->where('id',$attachmentId)->first();
        abort_unless($file && Storage::disk('local')->exists($file->path),404);
        $path=Storage::disk('local')->path($file->path); abort_unless(hash_equals($file->sha256,hash_file('sha256',$path)),409,'Empreinte fichier invalide.');
        return response()->download($path,$file->name,['Content-Type'=>'application/octet-stream','X-Content-Type-Options'=>'nosniff','Cache-Control'=>'private, no-store']);
    }

    private function permission(Request $request, string $permission): void
    {
        $permissions=(array)$request->attributes->get('officine.permissions', []);
        abort_unless(in_array($permission,$permissions,true) || (bool)$request->attributes->get('officine.is_admin',false),403,'Permission documentaire requise.');
    }

    private function audit(Request $request, Document $document, string $action): void
    {
        DB::table('document_audit_events')->insert(['officine_id'=>(int)app('tenant.officine_id'),'document_id'=>$document->id,'actor_id'=>$request->user()->id,'action'=>$action,'version'=>$document->version,'created_at'=>now()]);
    }
}
