<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            // chair_plus s'attache à UN coiffeur ; chair_business s'attache à
            // UN salon (couvre toute l'équipe — voir HairdresserProfile::hasChairPlus()).
            // Exactement un des deux est rempli selon le plan.
            $table->foreignId('hairdresser_profile_id')->nullable()
                ->constrained('hairdresser_profiles')->cascadeOnDelete();
            $table->foreignId('salon_id')->nullable()
                ->constrained('salons')->cascadeOnDelete();

            $table->enum('plan', ['chair_plus', 'chair_business']);
            $table->enum('status', ['trialing', 'active', 'past_due', 'canceled'])->default('trialing');

            $table->string('stripe_customer_id')->nullable();
            $table->string('stripe_subscription_id')->nullable()->unique();

            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_end')->nullable();
            $table->timestamp('canceled_at')->nullable();

            $table->timestamps();

            $table->index(['hairdresser_profile_id', 'status']);
            $table->index(['salon_id', 'status']);
            $table->index('stripe_customer_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
