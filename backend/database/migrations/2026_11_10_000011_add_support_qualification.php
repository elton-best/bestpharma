<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
 public function up():void{Schema::table('support_requests',function(Blueprint $t){$t->string('qualification',30)->nullable();$t->text('qualification_note')->nullable();$t->foreignId('qualified_by')->nullable()->constrained('users')->restrictOnDelete();$t->timestamp('qualified_at')->nullable();});}
 public function down():void{Schema::table('support_requests',function(Blueprint $t){$t->dropConstrainedForeignId('qualified_by');$t->dropColumn(['qualification','qualification_note','qualified_at']);});}
};
