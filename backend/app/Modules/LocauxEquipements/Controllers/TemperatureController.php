<?php
declare(strict_types=1);

namespace App\Modules\LocauxEquipements\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Services\OfficineAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class TemperatureController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $office = OfficineAccess::admin($request);
        $query = DB::table('temperature_records')->where('officine_id', $office);
        if ($request->filled('zone')) $query->where('zone', $request->query('zone'));
        if ($request->filled('date')) $query->whereDate('measured_at', $request->query('date'));
        $page = $query->orderByDesc('measured_at')->paginate(30);
        $page->getCollection()->transform(fn ($row) => $this->serializeRecord($row));
        return response()->json($page);
    }

    public function store(Request $request): JsonResponse
    {
        $office = OfficineAccess::admin($request);
        $data = $request->validate([
            'zone' => ['required', 'string', 'in:refrigeree_2_8,magasin_reserve,hall_dispensation'],
            'temperature' => ['required', 'numeric', 'between:-100,150'],
            'minimum' => ['nullable', 'numeric', 'between:-100,150'],
            'maximum' => ['nullable', 'numeric', 'between:-100,150'],
            'humidity' => ['nullable', 'numeric', 'between:0,100'],
            'measured_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $cfg = config('temperatures.zones.'.$data['zone']);
        $state = 'a_evaluer';
        if ($cfg['min'] !== null || $cfg['max'] !== null) {
            $state = (($cfg['min'] !== null && $data['temperature'] < $cfg['min']) || ($cfg['max'] !== null && $data['temperature'] > $cfg['max'])) ? 'excursion' : 'dans_limites_configurees';
        }
        $id = DB::table('temperature_records')->insertGetId([
            'officine_id' => $office, 'zone' => $data['zone'], 'temperature' => $data['temperature'],
            'minimum' => $data['minimum'] ?? null, 'maximum' => $data['maximum'] ?? null,
            'humidity' => $data['humidity'] ?? null,
            'measured_at' => CarbonImmutable::parse($data['measured_at'], 'Africa/Porto-Novo')->utc(),
            'recorded_by' => $request->user()->id, 'conformity_status' => $state,
            'notes' => $data['notes'] ?? null, 'created_at' => now(), 'updated_at' => now(),
        ]);
        return response()->json(['data' => $this->serializeRecord(DB::table('temperature_records')->where('id', $id)->first()), 'alert' => $state === 'excursion', 'message' => $state === 'excursion' ? 'Écart aux limites configurées enregistré. Aucune quarantaine ni analyse de cause n’a été effectuée.' : 'Relevé horodaté enregistré.'], 201);
    }

    public function import(Request $request): JsonResponse
    {
        $office = OfficineAccess::admin($request);
        $request->validate(['file' => ['required', 'file', 'max:10240'], 'zone' => ['required', 'in:refrigeree_2_8,magasin_reserve,hall_dispensation']]);
        $stream = fopen($request->file('file')->getRealPath(), 'rb');
        $header = fgetcsv($stream, 0, ';');
        if (!$header || count($header) < 2) { fclose($stream); throw ValidationException::withMessages(['file' => 'CSV invalide : en-têtes explicites requis.']); }
        $norm = static fn ($s) => mb_strtolower(trim(preg_replace('/\s+/u', ' ', (string) $s)));
        $headers = array_map($norm, $header);
        $find = static function (array $names) use ($headers): ?int { foreach ($names as $name) { $i = array_search($name, $headers, true); if ($i !== false) return $i; } return null; };
        $dateI = $find(['date']); $timeI = $find(['heure', 'time']); $datetimeI = $find(['date/heure', 'datetime', 'timestamp']);
        $tempI = $find(['température (°c)', 'temperature (°c)', 'température', 'temperature', 'temp (°c)', 'temp']);
        $minI = $find(['température min (°c)', 'temperature min (°c)', 'minimum']);
        $maxI = $find(['température max (°c)', 'temperature max (°c)', 'maximum']);
        $humidityI = $find(['humidité (%)', 'humidity (%)', 'humidity']);
        if ($tempI === null || ($datetimeI === null && ($dateI === null || $timeI === null))) { fclose($stream); throw ValidationException::withMessages(['file' => 'Le CSV doit contenir une température et une date/heure explicites.']); }
        $imported = 0; $rejected = []; $line = 1;
        while (($row = fgetcsv($stream, 0, ';')) !== false) {
            $line++;
            if ($datetimeI !== null) {
                $rawDate = trim((string) ($row[$datetimeI] ?? ''));
            } else {
                $datePart = trim((string) ($row[$dateI] ?? ''));
                $timePart = trim((string) ($row[$timeI] ?? ''));
                $rawDate = $datePart !== '' && $timePart !== '' ? $datePart.' '.$timePart : '';
            }
            $rawTemp = trim((string) ($row[$tempI] ?? ''));
            try {
                if (trim((string)$rawDate) === '' || $rawTemp === '' || !is_numeric(str_replace(',', '.', $rawTemp))) throw new \RuntimeException('date/heure ou température absente/invalide');
                $stamp = CarbonImmutable::parse($rawDate, 'Africa/Porto-Novo')->utc();
                $values = ['officine_id'=>$office,'zone'=>$request->input('zone'),'temperature'=>(float)str_replace(',', '.', $rawTemp),'minimum'=>isset($row[$minI])&&$row[$minI]!==''?(float)str_replace(',', '.', $row[$minI]):null,'maximum'=>isset($row[$maxI])&&$row[$maxI]!==''?(float)str_replace(',', '.', $row[$maxI]):null,'humidity'=>isset($row[$humidityI])&&$row[$humidityI]!==''?(float)str_replace(',', '.', $row[$humidityI]):null,'measured_at'=>$stamp,'recorded_by'=>$request->user()->id,'conformity_status'=>'a_evaluer','notes'=>null,'created_at'=>now(),'updated_at'=>now()];
                DB::table('temperature_records')->insert($values); $imported++;
            } catch (\Throwable) { $rejected[] = ['line'=>$line,'reason'=>'Date/heure ou température manquante ou invalide.']; }
        }
        fclose($stream);
        return response()->json(['imported_count'=>$imported,'rejected_count'=>count($rejected),'rejected_rows'=>$rejected]);
    }

    public function stats(Request $request): JsonResponse
    {
        $office = OfficineAccess::admin($request);
        $zones = DB::table('temperature_records')->where('officine_id',$office)->select('zone',DB::raw('count(*) as count'),DB::raw('max(measured_at) as latest'))->groupBy('zone')->get();
        return response()->json(['zones'=>$zones,'total'=>DB::table('temperature_records')->where('officine_id',$office)->count()]);
    }

    private function serializeRecord(object $record): object
    {
        $record->measured_at = CarbonImmutable::parse($record->measured_at, 'UTC')->utc()->toIso8601String();
        return $record;
    }
}
