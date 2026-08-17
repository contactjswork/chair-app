<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Additive, non cassante : profile_views comptait déjà les vues agrégées
// (stats pro), cette colonne permet EN PLUS de savoir QUEL client connecté a
// vu QUEL profil, quand connu — nullable, jamais renseignée pour un visiteur
// non connecté (pas de fingerprinting anonyme ici). Sert le signal produit
// "profils déjà consultés par ce client" pour le scoring de recommandation.
class AddViewerUserIdToProfileViewsTable extends Migration
{
    public function up()
    {
        Schema::table('profile_views', function (Blueprint $table) {
            $table->foreignId('viewer_user_id')->nullable()->after('hairdresser_profile_id')
                ->constrained('users')->nullOnDelete();
            $table->index(['viewer_user_id', 'created_at']);
        });
    }

    public function down()
    {
        Schema::table('profile_views', function (Blueprint $table) {
            $table->dropForeign(['viewer_user_id']);
            $table->dropIndex(['viewer_user_id', 'created_at']);
            $table->dropColumn('viewer_user_id');
        });
    }
}
