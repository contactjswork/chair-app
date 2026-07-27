<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->string('diploma_document_url')->nullable()->after('diploma');
            $table->string('diploma_status')->default('none')->after('diploma_document_url'); // none|pending|verified|rejected
        });

        // Les diplômes déjà déclarés avant ce système de vérification repartent
        // à zéro (statut "none") — le badge diploma_added redevient verrouillé
        // tant qu'un document n'est pas envoyé et validé.
    }

    public function down(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn(['diploma_document_url', 'diploma_status']);
        });
    }
};
