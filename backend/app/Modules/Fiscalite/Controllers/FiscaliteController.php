<?php
declare(strict_types=1);
namespace App\Modules\Fiscalite\Controllers;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
class FiscaliteController extends Controller
{
    public function index(): JsonResponse
    {
        // TODO: lister avec scoping tenant
        return response()->json(['data' => []]);
    }
}
