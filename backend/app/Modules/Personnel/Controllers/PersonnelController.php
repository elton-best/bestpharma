<?php
declare(strict_types=1);
namespace App\Modules\Personnel\Controllers;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
class PersonnelController extends Controller
{
    public function index(): JsonResponse
    {
        // TODO: lister avec scoping tenant
        return response()->json(['data' => []]);
    }
}
