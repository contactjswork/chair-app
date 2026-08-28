<?php

namespace App\Console\Commands;

use App\Models\HairdresserProfile;
use App\Models\Salon;
use App\Services\GeocodingService;
use Illuminate\Console\Command;

/**
 * Prépare un salon de démonstration pour voir, sur un vrai téléphone, tout ce
 * qui a été mis en place autour du salon et du coiffeur salarié :
 *
 *  - le bouton « Réserver dans ce salon » sur la fiche salon ;
 *  - la carte, l'itinéraire et le bouton d'appel ;
 *  - la note du salon calculée sur les avis de son équipe ;
 *  - la section « Leurs réalisations » ;
 *  - et surtout, sur la fiche d'un coiffeur SALARIÉ : le bouton flottant de
 *    réservation et chaque prestation cliquable vers l'agenda du salon.
 *
 * Ne touche qu'à des champs de présentation (lien, téléphone, adresse,
 * coordonnées) et n'écrit que ce qui manque, sauf pour le lien de réservation
 * qui est le sujet du test. `--clear` remet tout ce que la commande a posé à
 * null, pour ne rien laisser traîner après la démonstration.
 */
class DemoSalonBooking extends Command
{
    protected $signature = 'chair:demo-salon-booking
        {salon? : Slug du salon — à défaut, un salon ayant un coiffeur salarié est choisi}
        {--url= : Lien de réservation à poser}
        {--phone= : Téléphone du salon}
        {--clear : Retire le lien, le téléphone et les coordonnées posés}';

    protected $description = "Prépare (ou nettoie) un salon de démonstration avec réservation externe et coiffeur salarié";

    public function handle(): int
    {
        $slug = $this->argument('salon');

        $salon = $slug
            ? Salon::where('slug', $slug)->first()
            // Sans argument : un salon qui a réellement un salarié, sinon la
            // moitié de ce qu'on veut montrer n'existe pas sur la fiche.
            : Salon::whereHas('hairdressers', function ($q) {
                $q->where('is_independent', 0);
            })->whereNull('suspended_at')->first();

        if (!$salon) {
            $this->error($slug
                ? "Aucun salon avec le slug « {$slug} »."
                : "Aucun salon n'a de coiffeur salarié — précise un slug en argument.");
            return 1;
        }

        if ($this->option('clear')) {
            $salon->update(['booking_url' => null]);
            $this->info("Lien de réservation retiré de « {$salon->name} ».");
            $this->line('Le téléphone, l\'adresse et les coordonnées sont conservés : ils peuvent être réels.');
            return 0;
        }

        $url = $this->option('url') ?: 'https://www.planity.com';
        if (!str_starts_with($url, 'https://')) {
            $this->error('Le lien doit commencer par https://');
            return 1;
        }

        $changes = ['booking_url' => $url];

        // Le reste n'est écrit que s'il manque : on ne remplace jamais une
        // donnée réelle par une donnée de démonstration.
        if ($this->option('phone') && !$salon->phone) {
            $changes['phone'] = $this->option('phone');
        }

        if ($salon->latitude === null || $salon->longitude === null) {
            $coords = $salon->city ? GeocodingService::geocode($salon->city) : null;
            if ($coords) {
                $changes['latitude']  = $coords['lat'];
                $changes['longitude'] = $coords['lng'];
            }
        }

        $salon->update($changes);
        $salon->refresh();

        $salaried = HairdresserProfile::where('salon_id', $salon->id)
            ->where('is_independent', 0)
            ->with('user')
            ->first();

        $this->line('');
        $this->info("Salon prêt : {$salon->name}");
        $this->line("  lien       : {$salon->booking_url}");
        $this->line('  téléphone  : ' . ($salon->phone ?: '— aucun, relance avec --phone="03 88 …"'));
        $this->line('  carte      : ' . ($salon->latitude !== null ? 'coordonnées présentes' : '— aucune, la carte ne s\'affichera pas'));
        $this->line('  équipe     : ' . $salon->hairdressers()->count() . ' coiffeur(s)');
        $this->line('');
        $this->line('À ouvrir dans CHAIR :');
        $this->line("  Fiche salon    → /app/salon/{$salon->slug}");

        if ($salaried) {
            $this->line("  Coiffeur salarié → /app/coiffeur/{$salaried->slug}  ({$salaried->user?->name})");
            $this->line('');
            $this->line('Sur la fiche du salarié : bouton flottant « Réserver au salon »,');
            $this->line('et onglet Services où CHAQUE prestation ouvre l\'agenda du salon.');
        } else {
            $this->warn('Ce salon n\'a aucun coiffeur salarié : la moitié de la démonstration manquera.');
        }

        $this->line('');
        $this->line("Pour tout retirer : php artisan chair:demo-salon-booking {$salon->slug} --clear");

        return 0;
    }
}
