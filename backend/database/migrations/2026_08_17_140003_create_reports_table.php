<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table 'reports' réelle — AdminController::reports()/ignoreReport()
 * lisaient déjà DB::table('reports') derrière un try/catch "table
 * optionnelle" (elle n'a jamais existé en migration). Le frontend
 * app/admin/signalements/page.tsx est déjà câblé sur ce contrat exact
 * (type/reported_user_name/reported_user_id/reason/reporter_name/
 * created_at/content_id) — cette table le rend enfin fonctionnel.
 *
 * type reste une string simple ('post'|'review'|'user'), pas un morph
 * Eloquent classique : c'est le contrat déjà attendu par le frontend
 * existant (TypeBadge) et content_id pointe directement vers la ligne
 * reviews/posts concernée (nullable pour type='user').
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // 'post' | 'review' | 'user'
            $table->unsignedBigInteger('content_id')->nullable();
            $table->foreignId('reported_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason');
            $table->text('details')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('resolution')->nullable(); // 'ignored' | 'content_deleted' | 'author_suspended'
            $table->timestamps();

            $table->index(['type', 'content_id']);
            $table->index('resolved_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
