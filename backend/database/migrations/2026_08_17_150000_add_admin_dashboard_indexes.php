<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Index pour le dashboard "aujourd'hui" + croissance + insights business
 * (voir rapport de mission "Statistiques et Insights"). Toutes les requêtes
 * d'agrégation ajoutées filtrent/groupent sur ces colonnes — sans index
 * dessus, chaque appel au dashboard admin devient un full table scan qui se
 * dégrade au fur et à mesure que users/appointments/reviews/posts
 * grossissent. Aucune de ces colonnes n'avait d'index avant cette migration
 * (vérifié dans les migrations de création de table).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Compteurs "nouveaux X aujourd'hui/cette semaine" filtrés par rôle + date.
            $table->index(['role', 'created_at'], 'users_role_created_at_index');
            // Alerte "comptes suspendus" + jointures ville pour la couverture géo.
            $table->index('suspended_at', 'users_suspended_at_index');
            $table->index('city', 'users_city_index');
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->index('created_at', 'appointments_created_at_index');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->index('created_at', 'reviews_created_at_index');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->index('created_at', 'posts_created_at_index');
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            // Compteur "nouveaux CHAIR+/BUSINESS" + MRR (déjà lu sans index dans
            // AdminController::subscriptions(), voir mission).
            $table->index(['plan', 'status', 'created_at'], 'subscriptions_plan_status_created_index');
        });

        Schema::table('salons', function (Blueprint $table) {
            $table->index('created_at', 'salons_created_at_index');
            $table->index('suspended_at', 'salons_suspended_at_index');
            $table->index('city', 'salons_city_index');
        });

        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->index('diploma_status', 'hairdresser_profiles_diploma_status_index');
            $table->index('created_at', 'hairdresser_profiles_created_at_index');
            // Insight "demande vs offre par ville" + couverture géo : group by city.
            $table->index(['city', 'is_hidden'], 'hairdresser_profiles_city_hidden_index');
        });

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            // Utilisateurs actifs / proxy de rétention (MAX(last_used_at) par
            // utilisateur, filtré par type + fenêtre de temps). morphs() indexe
            // déjà (tokenable_type, tokenable_id) mais pas last_used_at.
            $table->index(['tokenable_type', 'last_used_at'], 'pat_tokenable_type_last_used_index');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_role_created_at_index');
            $table->dropIndex('users_suspended_at_index');
            $table->dropIndex('users_city_index');
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('appointments_created_at_index');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex('reviews_created_at_index');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex('posts_created_at_index');
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex('subscriptions_plan_status_created_index');
        });

        Schema::table('salons', function (Blueprint $table) {
            $table->dropIndex('salons_created_at_index');
            $table->dropIndex('salons_suspended_at_index');
            $table->dropIndex('salons_city_index');
        });

        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropIndex('hairdresser_profiles_diploma_status_index');
            $table->dropIndex('hairdresser_profiles_created_at_index');
            $table->dropIndex('hairdresser_profiles_city_hidden_index');
        });

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropIndex('pat_tokenable_type_last_used_index');
        });
    }
};
