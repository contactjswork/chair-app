<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateSupportRequestsTable extends Migration
{
    public function up()
    {
        Schema::create('support_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('subject');
            $table->text('message');
            // Vrai flag, posé à la création selon hasChairPlus() au moment de
            // l'envoi — pas recalculé après coup (le tri reflète l'abonnement
            // au moment de la demande, cohérent avec ce que l'utilisateur a vécu).
            $table->boolean('priority')->default(false);
            $table->enum('status', ['open', 'answered', 'closed'])->default('open');
            $table->timestamps();
            $table->index(['status', 'priority']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('support_requests');
    }
}
