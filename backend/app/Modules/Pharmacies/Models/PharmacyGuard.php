<?php
declare(strict_types=1);
namespace App\Modules\Pharmacies\Models;
use Illuminate\Database\Eloquent\Model;
final class PharmacyGuard extends Model { protected $table='pharmacy_guards'; protected $guarded=[]; protected $casts=['starts_at'=>'immutable_datetime','ends_at'=>'immutable_datetime']; }
