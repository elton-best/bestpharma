<?php

declare(strict_types=1);

namespace App\Modules\Reporting\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportExport extends Model
{
    protected $table = 'report_exports';

    protected $fillable = [
        'officine_id',
        'report_run_id',
        'export_ref',
        'format',
        'row_count',
        'filtered_sensitive_fields',
        'file_checksum_sha256',
        'exported_by_user_id',
        'exported_at',
    ];

    protected $casts = [
        'row_count' => 'integer',
        'filtered_sensitive_fields' => 'boolean',
        'exported_at' => 'datetime',
    ];

    public function run(): BelongsTo
    {
        return $this->belongsTo(ReportRun::class, 'report_run_id');
    }

    public function exportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'exported_by_user_id');
    }
}
