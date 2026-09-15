<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Journal produit — un INSERT et rien d'autre.
 *
 * Fire-and-forget absolu : un échec d'analytics ne doit JAMAIS faire
 * échouer l'action métier qui l'a déclenché (une inscription qui plante
 * parce qu'un compteur n'a pas pu s'écrire serait absurde).
 *
 * Événements suivis (source unique, ne pas inventer de noms ailleurs) :
 *   inscription_client / inscription_pro, reservation, visite_verifiee,
 *   avis_verifie, demande_fauteuil, invitation_equipe_acceptee,
 *   abonnement_demarre.
 */
class EventLog
{
    public static function record(string $name, ?int $userId = null, array $meta = []): void
    {
        try {
            DB::table('product_events')->insert([
                'name'       => $name,
                'user_id'    => $userId,
                'meta'       => $meta === [] ? null : json_encode($meta),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::debug('EventLog perdu (jamais bloquant)', ['name' => $name, 'err' => $e->getMessage()]);
        }
    }
}
