<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ajoute department/region comme colonnes stockées (choisies via un
 * sélecteur en cascade à l'inscription), en complément — pas en
 * remplacement — de la dérivation existante par code postal
 * (GeoLookupService). Une valeur choisie explicitement est plus fiable
 * qu'une dérivation, mais tous les profils existants n'en ont pas encore.
 */
return new class extends Migration
{
    public function up()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->string('department', 100)->nullable()->after('postal_code');
            $table->string('region', 100)->nullable()->after('department');
        });

        Schema::table('salons', function (Blueprint $table) {
            $table->string('department', 100)->nullable()->after('postal_code');
            $table->string('region', 100)->nullable()->after('department');
        });
    }

    public function down()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn(['department', 'region']);
        });

        Schema::table('salons', function (Blueprint $table) {
            $table->dropColumn(['department', 'region']);
        });
    }
};
