<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Le partage/copie de lien pouvait déclencher des points côté client, et même
// la voie légitime (attributeSignup à l'inscription) n'avait qu'un exists()
// PHP comme garde-fou — une course entre deux requêtes concurrentes pouvait
// créditer deux fois le même filleul. On ajoute target_type/target_id (déjà
// calculés par ReferralService mais jamais persistés sur cette table) et une
// contrainte unique en base : impossible d'avoir deux récompenses "reason"
// pour la même cible, même sous concurrence. Voir ReferralService::recordAndReward.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('referral_rewards', function (Blueprint $table) {
            $table->string('target_type', 40)->nullable()->after('reason');
            $table->unsignedBigInteger('target_id')->nullable()->after('target_type');
        });

        // MySQL : plusieurs NULL sont autorisés dans un index unique (ils ne
        // sont jamais considérés égaux entre eux), donc les récompenses sans
        // cible (share_profile, milestones...) ne se bloquent pas entre elles.
        Schema::table('referral_rewards', function (Blueprint $table) {
            $table->unique(['reason', 'target_type', 'target_id'], 'referral_rewards_reason_target_unique');
        });
    }

    public function down(): void
    {
        Schema::table('referral_rewards', function (Blueprint $table) {
            $table->dropUnique('referral_rewards_reason_target_unique');
            $table->dropColumn(['target_type', 'target_id']);
        });
    }
};
