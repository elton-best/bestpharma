<?php
declare(strict_types=1);
namespace App\Modules\Tenancy\Controllers;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
class TenancyController extends Controller
{
    public function index(): JsonResponse
    {
        // TODO: lister avec scoping tenant
        return response()->json(['data' => []]);
    }
}
