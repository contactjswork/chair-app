<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Intentions de réservation — le chaînon manquant du coiffeur salarié.
 *
 * Quand un client réserve chez un salarié, la réservation se fait sur
 * l'agenda du salon (Planity, Zenoti…), hors de CHAIR. À cet instant, CHAIR
 * perd sa trace : pas de rendez-vous enregistré, pas de rappel, pas
 * d'invitation à noter. Un salarié pouvait donc être réservé sans jamais
 * construire de réputation — ce qui vide de son sens la promesse « le
 * coiffeur au centre ».
 *
 * Ce que cette table N'EST PAS : une réservation. On ne sait pas si le client
 * a réservé, ni pour quand, et on ne le lui demandera pas — lui faire remplir
 * la comptabilité de CHAIR est exactement la friction à éviter.
 *
 * Ce qu'elle EST : la trace qu'une personne a ouvert l'agenda d'un coiffeur
 * depuis CHAIR. Elle sert à deux choses, et deux seulement :
 *
 *  1. rappeler discrètement au client, à sa prochaine ouverture de l'app, de
 *     faire scanner le QR de son coiffeur sur place — le seul geste qui
 *     prouve vraiment la visite, et le seul qui produise un avis certifié ;
 *  2. prouver au coiffeur que CHAIR lui amène du monde, ce qui lui donne une
 *     raison de sortir son QR.
 *
 * L'intention se résout d'elle-même dès qu'une visite vérifiée est
 * enregistrée pour ce couple client/coiffeur : c'est le QR qui fait foi,
 * jamais la déclaration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_intents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('hairdresser_id')->constrained('hairdresser_profiles')->cascadeOnDelete();
            // Le salon dont l'agenda a été ouvert — null si le coiffeur est
            // indépendant et utilise son propre lien.
            $table->foreignId('salon_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('opened_at');
            // Résolue par une visite vérifiée (le QR), ou écartée par le
            // client. Tant que c'est null, le rappel reste pertinent.
            $table->timestamp('resolved_at')->nullable();
            $table->string('resolution', 20)->nullable(); // visited | dismissed
            $table->timestamps();

            // Le rappel cherche « mes intentions non résolues, les plus
            // récentes d'abord » ; la statistique pro cherche « les intentions
            // de ce coiffeur sur une période ».
            $table->index(['user_id', 'resolved_at']);
            $table->index(['hairdresser_id', 'opened_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_intents');
    }
};
