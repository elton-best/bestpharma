<?php
declare(strict_types=1);
namespace App\Modules\Tenancy\Scopes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (app()->bound('tenant.officine_id')) {
            $builder->where($model->getTable().'.officine_id', app('tenant.officine_id'));
        } else {
            $builder->whereRaw('1 = 0');
        }
    }
}
