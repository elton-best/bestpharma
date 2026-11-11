<?php
declare(strict_types=1);
namespace App\Modules\Documents\Services;
class DocumentsService
{
    public function fingerprint(string $content): string
    {
        return hash('sha256', $content);
    }
}
