<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La réalisation qu'un client montre en réservant : « je voudrais ça ».
 *
 * Toute la valeur de CHAIR tient dans le portfolio — on choisit un coiffeur
 * pour son travail, pas pour son adresse. Et au moment précis où cette valeur
 * compterait le plus, elle se perdait : le client tombait sur une photo,
 * l'admirait, puis se retrouvait devant un champ « Message (optionnel) » où
 * il devait DÉCRIRE EN MOTS ce qu'il venait de voir en image.
 *
 * Décrire une coupe est difficile, et le malentendu qui s'ensuit est le
 * premier motif de déception en salon. Pointer une photo ne l'est pas.
 *
 * Le portfolio devient donc un briefing : la réalisation choisie voyage avec
 * la demande jusqu'à l'agenda du coiffeur.
 *
 * Restreint aux réalisations DU coiffeur réservé (contrôlé à l'enregistrement,
 * voir AppointmentController::store) : montrer le travail d'un confrère
 * serait au mieux maladroit, au pire vexant — et ne prouve pas que celui-ci
 * sait le faire.
 *
 * nullOnDelete : une réalisation supprimée ne doit jamais emporter le
 * rendez-vous avec elle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('reference_post_id')
                ->nullable()
                ->after('service')
                ->constrained('posts')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['reference_post_id']);
            $table->dropColumn('reference_post_id');
        });
    }
};
