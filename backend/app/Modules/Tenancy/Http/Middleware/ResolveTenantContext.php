<?php

declare(strict_types=1);

namespace App\Modules\Tenancy\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ResolveTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        // A tenant selector is never proof of access. Validate membership on every request.
        $id = $request->header('X-Officine-ID');
        abort_unless(is_string($id) && ctype_digit($id) && (int) $id > 0, 422, 'Sélectionnez une officine valide.');
        abort_unless($request->user(), 401);
        $membership = DB::table('officine_user')
            ->join('officines', 'officines.id', '=', 'officine_user.officine_id')
            ->where('officine_user.officine_id', (int) $id)
            ->where('officine_user.user_id', $request->user()->id)
            ->select('officine_user.id', 'officine_user.permissions', 'officine_user.is_admin', 'officine_user.is_active', 'officines.status')->first();
        $permissions=[];$admin=false;$type='member';
        if ($membership) {
            // A suspended membership cannot be bypassed through a parallel support assignment.
            abort_unless($membership->is_active && $membership->status==='active',403,'Accès officine suspendu ou non actif.');
            $permissions=json_decode($membership->permissions??'[]',true)?:[];
            $roles=DB::table('officine_member_roles')->join('officine_roles','officine_roles.id','=','officine_member_roles.role_id')->where('officine_roles.is_active',true)->where('membership_id',$membership->id)->where('officine_roles.officine_id',(int)$id)->pluck('officine_roles.permissions');
            foreach($roles as $role)$permissions=array_merge($permissions,json_decode($role,true)?:[]);
            $admin=(bool)$membership->is_admin;
            if($admin)$permissions=array_merge($permissions,['qualite.read','qualite.write']);
        } else {
            abort_unless((bool)$request->user()->is_support_staff && $request->user()->internal_active && DB::table('officines')->where('id',(int)$id)->where('status','active')->exists(),403,'Accès officine non autorisé.');
            $assignments=\App\Modules\Tenancy\Services\OfficineAccess::assignments($request->user()->id)->where('officine_id',(int)$id)->get();
            abort_unless($assignments->isNotEmpty(),403,'Affectation non approuvée ou hors période.');
            foreach($assignments as $assignment)$permissions=array_merge($permissions,array_intersect(json_decode($assignment->permissions,true)?:[],\App\Modules\Tenancy\Services\OfficineAccess::SUPPORT_PERMISSIONS));
            $type='support';
        }
        $request->attributes->set('officine.permissions',array_values(array_unique($permissions)));
        $request->attributes->set('officine.is_admin',$admin);
        $request->attributes->set('officine.access_type',$type);
        app()->instance('tenant.officine_id', (int) $id);
        try {
            return $next($request);
        } finally {
            // Do not leak context between requests (workers, tests, Octane).
            app()->forgetInstance('tenant.officine_id');
        }
    }
}
