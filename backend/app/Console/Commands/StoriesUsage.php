<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * La réalité d'usage des stories — l'outil de la décision.
 *
 * Usage : php artisan chair:stories-usage [--days=30]
 *
 * Les stories 24 h sont un argument de vente CHAIR+ qu'Instagram fait déjà,
 * avec l'audience en plus. La décision de les garder ou de les couper ne
 * doit pas se prendre à l'instinct : cette commande dit combien de
 * coiffeurs publient, à quelle fréquence, et si quelqu'un regarde.
 *
 * Lecture : si une poignée de coiffeurs publie et que les vues par story se
 * comptent sur les doigts d'une main, les couper RENFORCE CHAIR+ — l'offre
 * se resserre sur ce qui marche (portfolio permanent, vidéos courtes).
 */
class StoriesUsage extends Command
{
    protected $signature   = 'chair:stories-usage {--days=30}';
    protected $description = "Mesure l'usage réel des stories (créations, créateurs, vues)";

    public function handle(): int
    {
        $jours = (int) $this->option('days');
        $depuis = now()->subDays($jours);

        // Les stories expirées sont purgées : on mesure donc sur la table
        // vivante, ce qui borne l'historique à ~24 h pour le détail — mais
        // created_at des purgées est perdu. On complète par les LOGS de
        // création si disponibles ? Non : on mesure ce qui est mesurable et
        // on le DIT, plutôt que d'estimer en silence.
        $vivantes  = DB::table('stories')->count();
        $creees    = DB::table('stories')->where('created_at', '>=', $depuis)->count();
        $createurs = DB::table('stories')->where('created_at', '>=', $depuis)->distinct('user_id')->count('user_id');
        $vues      = (int) DB::table('stories')->where('created_at', '>=', $depuis)->sum('views_count');
        $abonnes   = (int) DB::table('stories')->where('created_at', '>=', $depuis)->avg('views_count');

        $this->info("Stories — fenêtre de {$jours} jour(s) (limitée par la purge 24 h : seules les stories encore vivantes sont comptées)");
        $this->line("  vivantes maintenant : {$vivantes}");
        $this->line("  créées sur la fenêtre observable : {$creees}, par {$createurs} coiffeur(s)");
        $this->line("  vues cumulées : {$vues} (moyenne " . round($abonnes ?? 0, 1) . " vue(s)/story)");
        $this->newLine();
        $this->comment('NOTE : la purge efface l\'historique. Pour une vraie mesure sur 30 jours,');
        $this->comment('planifier cette commande quotidiennement et agréger ses sorties — ou');
        $this->comment('ajouter un compteur persistant si la décision mérite plus de précision.');

        return 0;
    }
}
