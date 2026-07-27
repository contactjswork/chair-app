<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Extension du flow d'invitation gérant → coiffeur :
//  - email + token : inviter quelqu'un qui n'a pas encore de compte CHAIR
//    (hairdresser_id devient nullable — un seul des deux doit être rempli) ;
//  - expires_at : une invitation ne doit pas rester valable indéfiniment ;
//  - statuts cancelled/expired : "annuler" devient un vrai statut traçable
//    au lieu d'une suppression définitive de la ligne.
// La contrainte unique (salon_id, hairdresser_id) est retirée : elle ne
// fonctionnerait pas avec hairdresser_id nullable (MySQL traite NULL comme
// distinct à chaque fois) — la déduplication (pas de double invitation
// active) est vérifiée applicativement dans le contrôleur.
return new class extends Migration
{
    public function up(): void
    {
        // Il n'existe PAS de FK sur hairdresser_id (seul salon_id_foreign existe).
        // L'index unique (salon_id, hairdresser_id) est aussi le seul index
        // couvrant salon_id — dont salon_id_foreign dépend. Il faut donc créer
        // l'index de remplacement (salon_id, status) AVANT de retirer l'ancien
        // unique, sinon MySQL error 1553 ("needed in a foreign key constraint").
        Schema::table('salon_invitations', function (Blueprint $table) {
            $table->index(['salon_id', 'status']);
        });

        Schema::table('salon_invitations', function (Blueprint $table) {
            $table->dropUnique(['salon_id', 'hairdresser_id']);
        });

        DB::statement('ALTER TABLE salon_invitations MODIFY COLUMN hairdresser_id BIGINT UNSIGNED NULL');

        Schema::table('salon_invitations', function (Blueprint $table) {
            $table->foreign('hairdresser_id')->references('id')->on('hairdresser_profiles')->onDelete('cascade');
            $table->string('email')->nullable()->after('hairdresser_id');
            $table->string('token', 64)->nullable()->unique()->after('email');
            $table->timestamp('expires_at')->nullable()->after('message');
        });

        DB::statement("ALTER TABLE salon_invitations MODIFY COLUMN status ENUM('pending','accepted','declined','cancelled','expired') NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        Schema::table('salon_invitations', function (Blueprint $table) {
            $table->dropForeign(['hairdresser_id']);
            $table->dropColumn(['email', 'token', 'expires_at']);
        });
        DB::statement("ALTER TABLE salon_invitations MODIFY COLUMN status ENUM('pending','accepted','declined') DEFAULT 'pending'");
        DB::statement('ALTER TABLE salon_invitations MODIFY COLUMN hairdresser_id BIGINT UNSIGNED NOT NULL');
        Schema::table('salon_invitations', function (Blueprint $table) {
            $table->unique(['salon_id', 'hairdresser_id']);
        });
        Schema::table('salon_invitations', function (Blueprint $table) {
            $table->dropIndex(['salon_id', 'status']);
        });
    }
};
