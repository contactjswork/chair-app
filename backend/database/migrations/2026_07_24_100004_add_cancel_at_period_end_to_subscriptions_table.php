<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Stripe distingue "annulé maintenant" (customer.subscription.deleted) de
// "annulation programmée en fin de période" (l'abonné garde l'accès jusqu'à
// current_period_end, cancel_at_period_end=true sur customer.subscription.updated).
// Sans ce champ, impossible de distinguer honnêtement ces deux états côté UI.
class AddCancelAtPeriodEndToSubscriptionsTable extends Migration
{
    public function up()
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->boolean('cancel_at_period_end')->default(false)->after('status');
        });
    }

    public function down()
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('cancel_at_period_end');
        });
    }
}
