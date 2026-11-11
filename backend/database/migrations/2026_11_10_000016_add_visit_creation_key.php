<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{Schema::table('support_visits',function(Blueprint $t){$t->string('request_key',80)->nullable();$t->unique(['mission_id','request_key']);});}
 public function down():void{Schema::table('support_visits',function(Blueprint $t){$t->dropUnique(['mission_id','request_key']);$t->dropColumn('request_key');});}
};
