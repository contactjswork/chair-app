<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddSpecialtyIdToServicesTable extends Migration
{
    public function up()
    {
        Schema::table('services', function (Blueprint $table) {
            // Nullable pour ne pas casser les services existants créés avant cette
            // migration — nouveau formulaire de création les rend obligatoires côté front.
            $table->foreignId('specialty_id')->nullable()->after('category_id')
                ->constrained('specialties')->nullOnDelete();
        });
    }

    public function down()
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropForeign(['specialty_id']);
            $table->dropColumn('specialty_id');
        });
    }
}
