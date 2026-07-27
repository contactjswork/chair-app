<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('qr_tokens', function (Blueprint $table) {
            $table->foreignId('specialty_id')->nullable()->after('hairdresser_id')
                ->constrained('specialties')->nullOnDelete();
            // Qui a généré ce QR : le coiffeur lui-même (cas normal) ou un gérant de
            // salon qui l'attribue à un membre de son équipe (fallback — jamais pour
            // écrire un avis à sa place, seulement pour déclencher l'invitation).
            $table->foreignId('issued_by_user_id')->nullable()->after('specialty_id')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('qr_tokens', function (Blueprint $table) {
            $table->dropForeign(['specialty_id']);
            $table->dropForeign(['issued_by_user_id']);
            $table->dropColumn(['specialty_id', 'issued_by_user_id']);
        });
    }
};
