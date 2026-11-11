<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Documents\Services\DocumentsService;
use PHPUnit\Framework\TestCase;

final class DocumentsFingerprintTest extends TestCase
{
    public function test_fingerprint_is_deterministic_and_changes_with_document_content(): void
    {
        $service = new DocumentsService();
        $original = $service->fingerprint('Version témoin éàç');
        self::assertSame(hash('sha256', 'Version témoin éàç'), $original);
        self::assertSame($original, $service->fingerprint('Version témoin éàç'));
        self::assertNotSame($original, $service->fingerprint('Version témoin modifiée'));
    }
}
