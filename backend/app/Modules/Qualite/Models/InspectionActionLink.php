<?php

declare(strict_types=1);

namespace App\Modules\Qualite\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InspectionActionLink extends Model
{
    protected $table = 'inspection_action_links';

    protected $fillable = [
        'inspection_id',
        'response_id',
        'action_id',
    ];

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    public function response(): BelongsTo
    {
        return $this->belongsTo(InspectionResponse::class, 'response_id');
    }

    public function action(): BelongsTo
    {
        return $this->belongsTo(QualityAction::class, 'action_id');
    }
}
