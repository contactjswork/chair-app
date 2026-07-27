<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            // Boost local temporaire (récompense parrainage) — is_featured reste
            // le flag permanent (admin), featured_until l'extension temporaire.
            $table->timestamp('featured_until')->nullable()->after('is_featured');
            // Jours CHAIR+ banqués par le programme ambassadeur, avant même que
            // l'abonnement payant existe — juste un solde, pas encore consommé
            // par une logique de paywall (viendra avec CHAIR+ lui-même).
            $table->timestamp('chair_plus_until')->nullable()->after('featured_until');
        });
    }

    public function down(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn(['featured_until', 'chair_plus_until']);
        });
    }
};
