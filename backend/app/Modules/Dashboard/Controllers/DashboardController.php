<?php
declare(strict_types=1);
namespace App\Modules\Dashboard\Controllers;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        // TODO: lister avec scoping tenant
        return response()->json(['data' => []]);
    }
}
