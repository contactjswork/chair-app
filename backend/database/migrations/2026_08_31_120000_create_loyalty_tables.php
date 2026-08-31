<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La carte de fidélité — le premier add-on payant de CHAIR PRO.
 *
 * La carte tamponnée du salon, mais infalsifiable : ce sont les passages
 * vérifiés par scan du QR qui la font avancer, pas un tampon qu'on prête.
 * Le coiffeur choisit le nombre de passages et la récompense (« 10ᵉ passage
 * : -20 % », « 5ᵉ brushing offert »). Trois mécaniques existantes qui
 * s'emboîtent : le QR anti-fraude, les visites vérifiées, les notifications.
 *
 * L'add-on est distinct de CHAIR+ : `loyalty_addon_until` sur le profil.
 * Le paiement n'existe pas encore (pas de Stripe) — l'activation est
 * manuelle (admin) en attendant ; la mécanique, elle, est complète.
 *
 * `loyalty_rewards` fige le libellé et le seuil AU MOMENT du déblocage :
 * un coiffeur qui change sa récompense ensuite ne réécrit pas ce qu'il
 * doit déjà. C'est une dette envers le client, elle ne bouge plus.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->timestamp('loyalty_addon_until')->nullable()->after('booking_url');
        });

        Schema::create('loyalty_programs', function (Blueprint $table) {
            $table->id();
            // Un programme par coiffeur — la V1 reste lisible pour le client.
            $table->foreignId('hairdresser_id')->unique()->constrained('hairdresser_profiles')->cascadeOnDelete();
            $table->unsignedTinyInteger('visits_required');
            $table->string('reward_label', 80);
            $table->boolean('is_active')->default(true);
            // Point de départ du comptage : les passages antérieurs à
            // l'activation ne comptent pas, sinon les habitués débloqueraient
            // tout le premier jour et la carte n'aurait plus rien à raconter.
            $table->timestamp('counting_since');
            $table->timestamps();
        });

        Schema::create('loyalty_rewards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->cascadeOnDelete();
            $table->foreignId('client_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reward_label', 80);
            $table->unsignedTinyInteger('visits_required');
            $table->timestamp('unlocked_at');
            $table->timestamp('redeemed_at')->nullable();
            $table->timestamps();

            $table->index(['hairdresser_id', 'redeemed_at']);
            $table->index(['client_user_id', 'hairdresser_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_rewards');
        Schema::dropIfExists('loyalty_programs');
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn('loyalty_addon_until');
        });
    }
};
