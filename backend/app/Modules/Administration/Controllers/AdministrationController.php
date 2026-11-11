<?php
declare(strict_types=1);
namespace App\Modules\Administration\Controllers;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
class AdministrationController extends Controller
{
    public function index(): JsonResponse
    {
        // TODO: lister avec scoping tenant
        return response()->json(['data' => []]);
    }
}
