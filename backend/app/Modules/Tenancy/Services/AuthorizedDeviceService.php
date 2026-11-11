<?php
declare(strict_types=1);

namespace App\Modules\Tenancy\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class AuthorizedDeviceService
{
    public function list(Request $request): array
    {
        $officeId = OfficineAccess::admin($request);
        return DB::table('officine_authorized_devices')->where('officine_id', $officeId)
            ->whereNull('archived_at')->orderByDesc('is_active')->orderByDesc('last_seen_at')
            ->get(['id', 'name', 'type', 'is_attendance_terminal', 'is_active', 'last_seen_at', 'version', 'created_at'])
            ->map(fn ($row) => (array) $row)->all();
    }

    public function register(Request $request, array $data): array
    {
        $officeId = OfficineAccess::admin($request);
        $fingerprintHash = hash_hmac('sha256', $data['fingerprint'], (string) config('app.key'));

        return DB::transaction(function () use ($request, $officeId, $data, $fingerprintHash): array {
            OfficineAccess::lockAdmin($request, $officeId);
            $existing = DB::table('officine_authorized_devices')->where('officine_id', $officeId)
                ->where('fingerprint_hash', $fingerprintHash)->lockForUpdate()->first();
            abort_if($existing, 409, 'Cet appareil est déjà enregistré dans cette officine.');

            $id = DB::table('officine_authorized_devices')->insertGetId([
                'officine_id' => $officeId,
                'name' => trim($data['name']),
                'type' => $data['type'],
                'fingerprint_hash' => $fingerprintHash,
                'is_attendance_terminal' => $data['type'] === 'borne_pointage',
                'is_active' => true,
                'version' => 1,
                'registered_by' => $request->user()->id,
                'last_seen_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            OfficineAccess::audit($request, $officeId, 'device.registered', ['device_id' => $id, 'type' => $data['type']]);
            return $this->publicDevice($id, $officeId);
        });
    }

    public function transition(Request $request, string $id, int $version, bool $active): array
    {
        $officeId = OfficineAccess::admin($request);
        return DB::transaction(function () use ($request, $officeId, $id, $version, $active): array {
            OfficineAccess::lockAdmin($request, $officeId);
            $device = DB::table('officine_authorized_devices')->where('officine_id', $officeId)
                ->where('id', $id)->whereNull('archived_at')->lockForUpdate()->first();
            abort_unless($device, 404);
            abort_unless((int) $device->version === $version, 409, 'Version périmée. Rechargez le parc d’appareils.');
            abort_if((bool) $device->is_active === $active, 409, 'L’appareil est déjà dans cet état.');

            DB::table('officine_authorized_devices')->where('id', $id)->update([
                'is_active' => $active,
                'version' => $version + 1,
                'updated_at' => now(),
                ...($active ? ['last_seen_at' => now()] : []),
            ]);
            OfficineAccess::audit($request, $officeId, $active ? 'device.reactivated' : 'device.revoked', [
                'device_id' => (int) $id, 'from_version' => $version, 'version' => $version + 1,
            ]);
            return $this->publicDevice((int) $id, $officeId);
        });
    }

    private function publicDevice(int $id, int $officeId): array
    {
        return (array) DB::table('officine_authorized_devices')->where('officine_id', $officeId)->where('id', $id)
            ->first(['id', 'name', 'type', 'is_attendance_terminal', 'is_active', 'last_seen_at', 'version', 'created_at']);
    }
}
