<?php
declare(strict_types=1);
namespace App\Modules\Tenancy\Traits;
use App\Modules\Tenancy\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
trait BelongsToCompany
{
    protected static function bootBelongsToCompany(): void
    {
        static::addGlobalScope(new TenantScope);
        static::creating(function (Model $model): void {
            if (!app()->bound('tenant.officine_id')) {
                throw new \LogicException('A tenant context is required for tenant-owned writes.');
            }
            $tenant = (int) app('tenant.officine_id');
            if (!empty($model->officine_id) && (int) $model->officine_id !== $tenant) {
                throw new \LogicException('Cross-tenant creation is forbidden.');
            }
            $model->officine_id = $tenant;
        });
    }
    public function officine(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    { return $this->belongsTo(\App\Modules\Tenancy\Models\Officine::class, 'officine_id'); }
    public function scopeOfOfficine(Builder $q, int $officineId): Builder { return $q->where('officine_id', $officineId); }
}
