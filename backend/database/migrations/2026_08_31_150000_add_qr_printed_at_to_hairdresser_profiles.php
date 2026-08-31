<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Le coiffeur a-t-il imprimé son QR ?
 *
 * Le QR ne sert que s'il est SUR le comptoir. Cette date alimente la
 * checklist des premiers pas : « imprimer mon QR » est un des cinq gestes
 * qui lancent un profil, et il faut savoir s'il est fait.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->timestamp('qr_printed_at')->nullable()->after('loyalty_addon_until');
        });
    }

    public function down(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn('qr_printed_at');
        });
    }
};
