<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Achat intégré Apple (CHAIR+ dans le binaire CHAIR PRO iOS).
 *
 * La table `subscriptions` reste LE point de vérité unique de l'entitlement
 * (HairdresserProfile::hasChairPlus() ne change pas) : une ligne Apple y vit
 * à côté des lignes Stripe, distinguée par `provider`. Un même coiffeur ne
 * peut avoir qu'une souscription chair_plus couvrante à la fois — Apple OU
 * Stripe selon l'endroit où il s'est abonné.
 */
class AddAppleIapToSubscriptions extends Migration
{
    public function up()
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            // 'stripe' | 'apple' — défaut stripe : toutes les lignes existantes
            // viennent du Checkout Stripe.
            $table->string('provider', 20)->default('stripe')->after('status');
            // Identifiant STABLE d'un abonnement Apple à travers tous ses
            // renouvellements (les transaction_id changent à chaque période,
            // l'original_transaction_id jamais). Unique : un même abonnement
            // Apple ne peut pas être rattaché à deux profils.
            $table->string('apple_original_transaction_id')->nullable()->unique()->after('stripe_subscription_id');
            // Dernier reçu connu (base64) — ce que le serveur renvoie à Apple
            // pour resynchroniser renouvellements/annulations sans que
            // l'appareil soit dans la boucle (commande chair:sync-apple-subscriptions).
            $table->mediumText('apple_latest_receipt')->nullable()->after('apple_original_transaction_id');
        });
    }

    public function down()
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['provider', 'apple_original_transaction_id', 'apple_latest_receipt']);
        });
    }
}
