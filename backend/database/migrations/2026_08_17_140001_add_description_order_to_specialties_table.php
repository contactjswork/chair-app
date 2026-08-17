<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute description + order pour le CRUD admin des spécialités
 * (AdminSpecialtyController). order initialisé à l'ordre alphabétique
 * actuel (par pas de 10) pour ne pas perturber l'affichage existant tant
 * qu'aucun admin n'a réordonné.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('specialties', function (Blueprint $table) {
            $table->text('description')->nullable()->after('category');
            $table->unsignedInteger('order')->default(0)->after('is_active');
        });

        $order = 0;
        foreach (DB::table('specialties')->orderBy('name')->pluck('id') as $id) {
            $order += 10;
            DB::table('specialties')->where('id', $id)->update(['order' => $order]);
        }
    }

    public function down(): void
    {
        Schema::table('specialties', function (Blueprint $table) {
            $table->dropColumn(['description', 'order']);
        });
    }
};
