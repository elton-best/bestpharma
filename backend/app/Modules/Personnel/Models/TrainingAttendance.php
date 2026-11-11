<?php

declare(strict_types=1);

namespace App\Modules\Personnel\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrainingAttendance extends Model
{
    protected $table = 'training_attendances';

    protected $fillable = [
        'training_session_id',
        'employee_id',
        'presence_status',
        'score',
        'evaluation_comments',
        'certificate_ref',
        'version',
    ];

    protected $casts = [
        'score' => 'float',
        'version' => 'integer',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(TrainingSession::class, 'training_session_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
