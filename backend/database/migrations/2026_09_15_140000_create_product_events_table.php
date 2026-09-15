<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mini-analytics produit maison (sprint pré-lancement, 15/09/2026) : les
 * événements clés du funnel (inscription, réservation, scan, demande de
 * fauteuil…) comptés chez nous — pas d'outil tiers, pas de traceur, juste
 * de quoi piloter les premières semaines depuis l'admin.
 */
class CreateProductEventsTable extends Migration
{
    public function up()
    {
        Schema::create('product_events', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60)->index();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('created_at')->index();
        });
    }

    public function down()
    {
        Schema::dropIfExists('product_events');
    }
}
