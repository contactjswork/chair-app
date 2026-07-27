<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddInterviewStatusToJobApplicationsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        // Pipeline ATS à 5 étapes (Nouveau/À contacter/Entretien/Accepté/Refusé)
        // au lieu du simple accepter/refuser binaire — 'interview' vient
        // s'insérer entre 'viewed' (contacté) et 'accepted'.
        DB::statement("ALTER TABLE job_applications MODIFY COLUMN status ENUM('pending','viewed','interview','accepted','declined') NOT NULL DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::statement("UPDATE job_applications SET status='viewed' WHERE status='interview'");
        DB::statement("ALTER TABLE job_applications MODIFY COLUMN status ENUM('pending','viewed','accepted','declined') NOT NULL DEFAULT 'pending'");
    }
}
