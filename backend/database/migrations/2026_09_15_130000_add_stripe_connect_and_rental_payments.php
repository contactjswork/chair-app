<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modèle B de la location de fauteuil (décision Julien 15/09/2026) : le
 * coiffeur paie via CHAIR, Stripe Connect (agrément PSP) détient les fonds,
 * reverse au salon et prélève la commission CHAIR (application fee) —
 * CHAIR ne touche jamais l'argent directement (conformité DSP2).
 *
 * - salons.stripe_account_id : compte Connect Express du salon (KYC Stripe) ;
 * - chair_rental_payments : trace de chaque paiement (période, montant,
 *   commission, état) — la base du récapitulatif annuel DAC7/242 bis.
 */
class AddStripeConnectAndRentalPayments extends Migration
{
    public function up()
    {
        Schema::table('salons', function (Blueprint $table) {
            $table->string('stripe_account_id', 64)->nullable()->after('qr_token');
        });

        Schema::create('chair_rental_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chair_rental_request_id')->constrained('chair_rental_requests')->onDelete('cascade');
            $table->string('period', 10); // day | week | month
            $table->unsignedInteger('amount_cents');
            $table->unsignedInteger('application_fee_cents');
            $table->string('stripe_session_id', 128)->nullable()->index();
            $table->string('stripe_payment_intent_id', 128)->nullable();
            $table->string('status', 20)->default('pending'); // pending | paid | refunded
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('chair_rental_payments');
        Schema::table('salons', function (Blueprint $table) {
            $table->dropColumn('stripe_account_id');
        });
    }
}
