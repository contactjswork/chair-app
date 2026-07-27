<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddActiveProModeToUsersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // Double identité gérant/coiffeur : quel espace pro afficher par
            // défaut à la connexion pour un compte qui a les deux capacités
            // (Salon possédé + HairdresserProfile). Null tant que le compte
            // n'a qu'une seule capacité — le mode est alors déduit, jamais stocké.
            $table->string('active_pro_mode')->nullable()->after('role');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('active_pro_mode');
        });
    }
}
