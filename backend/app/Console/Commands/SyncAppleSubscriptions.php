<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Services\AppleIapService;
use Illuminate\Console\Command;

/**
 * Resynchronise les abonnements Apple depuis leurs derniers reçus stockés.
 *
 * Pourquoi côté serveur : les renouvellements et annulations App Store se
 * produisent sans que l'app soit ouverte — attendre que l'appareil renvoie
 * un reçu laisserait des accès CHAIR+ ouverts après annulation (ou fermés
 * après un réabonnement direct dans les réglages iOS).
 *
 * Cible : les lignes Apple encore couvrantes dont l'échéance approche ou
 * vient de passer, plus les lignes annulées récemment (réabonnement possible
 * depuis les réglages App Store — le même original_transaction_id revit).
 */
class SyncAppleSubscriptions extends Command
{
    protected $signature = 'chair:sync-apple-subscriptions';
    protected $description = 'Re-valide aupres d\'Apple les abonnements IAP proches de leur echeance';

    public function handle(): int
    {
        $rows = Subscription::where('provider', 'apple')
            ->whereNotNull('apple_latest_receipt')
            ->where(function ($q) {
                $q->where(function ($q) {
                    // Couvrant mais échéance sous 2 jours (ou déjà passée) :
                    // le renouvellement — ou son absence — est à constater.
                    $q->whereIn('status', ['trialing', 'active', 'past_due'])
                      ->where('current_period_end', '<', now()->addDays(2));
                })->orWhere(function ($q) {
                    // Annulé depuis moins de 60 jours : un réabonnement direct
                    // App Store réactiverait ce même abonnement.
                    $q->where('status', 'canceled')
                      ->where('current_period_end', '>', now()->subDays(60));
                });
            })
            ->get();

        foreach ($rows as $row) {
            AppleIapService::resync($row);
        }

        $this->info("Resynchronisés : {$rows->count()} abonnement(s) Apple.");

        return self::SUCCESS;
    }
}
