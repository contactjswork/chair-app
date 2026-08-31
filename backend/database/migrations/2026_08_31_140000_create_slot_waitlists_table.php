<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La liste d'attente sur un jour complet.
 *
 * Un coiffeur complet, c'est un client perdu — sauf si l'app propose
 * « prévenez-moi si ça se libère ». À l'annulation d'un rendez-vous, les
 * inscrits de ce jour-là reçoivent un push, premier arrivé premier servi
 * sur le créneau. Le coiffeur ne perd plus une annulation, le client
 * obtient le coiffeur qu'il voulait.
 *
 * Par JOUR et non par créneau : le client qui n'a pas trouvé de place le
 * mardi veut le mardi, pas spécifiquement 14 h 30 — et l'annulation qui
 * libère 15 h le sert tout autant.
 *
 * `notified_at` : chaque inscription ne produit qu'UN push. Un jour avec
 * trois annulations ne martèle pas trois fois les mêmes clients — après
 * le premier push, c'est à eux de jouer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('slot_waitlists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->cascadeOnDelete();
            $table->foreignId('client_user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->unique(['hairdresser_id', 'client_user_id', 'date'], 'waitlist_unique');
            $table->index(['hairdresser_id', 'date', 'notified_at'], 'waitlist_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('slot_waitlists');
    }
};
