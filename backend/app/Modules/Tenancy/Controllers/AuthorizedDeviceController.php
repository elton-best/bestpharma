<?php
declare(strict_types=1);

namespace App\Modules\Tenancy\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Services\AuthorizedDeviceService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class AuthorizedDeviceController extends Controller
{
    public function __construct(private readonly AuthorizedDeviceService $devices) {}

    public function index(Request $request)
    {
        return response()->json(['data' => $this->devices->list($request)]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'regex:/\S/u'],
            'type' => ['required', Rule::in(['caisse', 'pc_bureau', 'borne_pointage', 'tablette_inventaire', 'smartphone_nomade'])],
            'fingerprint' => ['required', 'string', 'min:32', 'max:512'],
        ]);
        return response()->json(['data' => $this->devices->register($request, $data)], 201);
    }

    public function revoke(Request $request, string $device)
    {
        $data = $request->validate(['version' => ['required', 'integer', 'min:1']]);
        return response()->json(['data' => $this->devices->transition($request, $device, (int) $data['version'], false)]);
    }

    public function reactivate(Request $request, string $device)
    {
        $data = $request->validate(['version' => ['required', 'integer', 'min:1']]);
        return response()->json(['data' => $this->devices->transition($request, $device, (int) $data['version'], true)]);
    }
}
