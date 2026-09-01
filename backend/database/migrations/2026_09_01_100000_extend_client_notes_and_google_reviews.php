<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * La fiche client s'enrichit de trois outils du coiffeur qui connaît ses
 * clients (lot du 01/09/2026) :
 *
 *  - advice : le conseil post-visite, VISIBLE par le client dans son app
 *    (contrairement à note, privée). advice_updated_at pour l'afficher daté.
 *  - rebook_weeks : le rythme de retour réglé PAR le coiffeur pour CE client
 *    (« ses racines, toutes les 6 semaines ») — prioritaire sur la moyenne
 *    calculée par SendRebookReminders.
 *  - relance_sent_at : anti-spam de la relance manuelle (30 jours minimum
 *    entre deux relances du même client).
 *
 * note devient nullable : une ligne peut désormais exister pour porter un
 * conseil ou un rythme sans note privée. Et hairdresser_profiles gagne
 * google_review_url — le pont vers l'avis Google.
 */
return new class extends Migration
{
    public function up()
    {
        // MODIFY direct : ->change() exigerait doctrine/dbal sur Laravel 8.
        DB::statement('ALTER TABLE client_notes MODIFY note TEXT NULL');

        Schema::table('client_notes', function (Blueprint $table) {
            $table->text('advice')->nullable()->after('note');
            $table->timestamp('advice_updated_at')->nullable()->after('advice');
            $table->unsignedTinyInteger('rebook_weeks')->nullable()->after('advice_updated_at');
            $table->timestamp('relance_sent_at')->nullable()->after('rebook_weeks');
        });

        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->string('google_review_url', 500)->nullable()->after('booking_url');
        });
    }

    public function down()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn('google_review_url');
        });

        Schema::table('client_notes', function (Blueprint $table) {
            $table->dropColumn(['advice', 'advice_updated_at', 'rebook_weeks', 'relance_sent_at']);
        });

        DB::table('client_notes')->whereNull('note')->delete();
        DB::statement('ALTER TABLE client_notes MODIFY note TEXT NOT NULL');
    }
};
