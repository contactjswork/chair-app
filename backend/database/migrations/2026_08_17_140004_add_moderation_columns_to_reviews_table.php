<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * reviews.status n'a JAMAIS existé en base — AdminController::hideReview()/
 * showReview() faisaient déjà $review->update(['status' => ...]) mais
 * 'status' n'étant ni une colonne ni dans $fillable, Eloquent l'ignorait
 * silencieusement (aucune erreur, aucun effet). Masquer un avis depuis
 * /admin/avis ne faisait donc RIEN. Corrigé ici : vraie colonne + ajout à
 * $fillable (voir Review.php).
 *
 * moderation_reviewed_at : permet à un modérateur de "traiter" un avis à
 * faible note (<=2 étoiles) sans le masquer (ex: avis légitime mais sévère)
 * — évite qu'il réapparaisse indéfiniment dans le filtre "signalés" de
 * /admin/avis. Distinct de status pour ne jamais mélanger "visible/masqué"
 * (modération de contenu) et "vu par un modérateur" (file d'attente).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->string('status')->default('visible')->after('rating'); // visible|hidden
            $table->timestamp('moderation_reviewed_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn(['status', 'moderation_reviewed_at']);
        });
    }
};
