<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La promo flash peut viser UNE spécialité (demande Julien 01/09/2026) :
 * « -30 % sur les Coupes Classiques demain », pas forcément tout le salon.
 * NULL = toutes les prestations (comportement d'origine). La remise ne
 * s'applique alors qu'aux services rattachés à cette spécialité.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('flash_promos', function (Blueprint $table) {
            $table->foreignId('specialty_id')->nullable()->after('date')
                ->constrained('specialties')->nullOnDelete();
        });
    }

    public function down()
    {
        Schema::table('flash_promos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('specialty_id');
        });
    }
};
