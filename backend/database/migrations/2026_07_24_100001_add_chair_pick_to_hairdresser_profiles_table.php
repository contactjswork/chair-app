<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// "Coup de cœur CHAIR" — sélection éditoriale, activée manuellement par
// l'équipe CHAIR (endpoint admin), indépendante de l'abonnement payant :
// un profil gratuit remarquable peut être mis en avant, tout comme un
// abonné CHAIR+ peut ne jamais l'être. Même mécanique temporelle que
// featured_until/chair_plus_until (colonne "jusqu'à quand", pas un booléen).
class AddChairPickToHairdresserProfilesTable extends Migration
{
    public function up()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->timestamp('chair_pick_until')->nullable()->after('featured_until');
        });
    }

    public function down()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn('chair_pick_until');
        });
    }
}
