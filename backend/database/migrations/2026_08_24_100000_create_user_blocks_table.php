<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Blocage d'utilisateur — exigence App Store Review Guideline 1.2 (UGC) :
 * "The ability to block abusive users from the service".
 *
 * Relation unidirectionnelle et privée : blocker_id ne voit plus le contenu
 * de blocked_user_id. Le bloqué n'est jamais notifié (règle de sécurité
 * standard : un blocage annoncé se retourne contre la victime).
 *
 * Contrainte unique sur le couple : un même blocage ne peut pas exister deux
 * fois, ce qui rend POST /users/{id}/block idempotent au niveau base et pas
 * seulement au niveau applicatif.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blocker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('blocked_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['blocker_id', 'blocked_user_id'], 'user_blocks_pair_unique');
            // Lecture chaude : "tous les comptes bloqués par X" (filtrage du feed)
            $table->index('blocker_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_blocks');
    }
};
