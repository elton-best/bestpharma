<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationJob extends Model
{
    protected $table = 'notification_jobs';

    protected $fillable = [
        'officine_id',
        'template_id',
        'report_run_id',
        'recipient_user_id',
        'channel',
        'status',
        'attempts',
        'last_error',
        'scheduled_for',
        'sent_at',
    ];

    protected $casts = [
        'attempts' => 'integer',
        'scheduled_for' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(ReportTemplate::class, 'template_id');
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(ReportRun::class, 'report_run_id');
    }
}
