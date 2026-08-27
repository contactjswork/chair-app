<?php

namespace App\Console\Commands;

use App\Models\Appointment;
use App\Models\HairdresserProfile;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Crée le compte client que l'équipe de review d'Apple utilisera pour tester
 * l'app (guideline 2.1 : un compte de démonstration pleinement fonctionnel).
 *
 * Pourquoi une commande plutôt qu'un script à coller dans tinker : le pavé
 * PHP équivalent se fait mutiler par les terminaux SSH web (lignes longues
 * tronquées, délimiteur de heredoc avalé), et tinker pré-importe déjà les
 * modèles — un `use App\Models\User;` y provoque une erreur fatale. Une
 * commande se récupère depuis Git et s'exécute en une ligne courte.
 *
 * Ce que le compte doit contenir, et pourquoi : chaque écran que le reviewer
 * ouvre doit avoir du contenu, sinon l'app paraît vide et le rejet est
 * quasi certain.
 *
 *  - 3 favoris .................. remplit l'onglet Favoris
 *  - 1 abonnement ............... alimente le fil
 *  - 1 rendez-vous à venir ...... permet de tester l'ANNULATION
 *  - 1 rendez-vous passé sans avis  permet de DÉPOSER un avis
 *
 * Les deux rendez-vous visent deux coiffeurs différents : la table `reviews`
 * porte un index unique (hairdresser_id, client_id), un même compte ne peut
 * donc noter chaque coiffeur qu'une fois.
 *
 * N'écrit rien d'autre et ne modifie aucune donnée existante. Refuse de
 * tourner si le compte existe déjà, pour rester rejouable sans dégât.
 */
class CreateReviewAccount extends Command
{
    protected $signature = 'chair:create-review-account
        {email : Email du compte de review}
        {password : Mot de passe en clair — à reporter dans App Store Connect}
        {--city=Strasbourg : Ville du compte, doit contenir des coiffeurs actifs}
        {--name=App Review : Nom affiché du compte}';

    protected $description = "Crée le compte client de démonstration pour la review Apple, avec favoris, abonnement et rendez-vous";

    /** Centroïdes des villes où la production a des coiffeurs visibles. */
    private const CITY_COORDS = [
        'Strasbourg' => [48.5734, 7.7521],
        'Haguenau'   => [48.8149, 7.7907],
        'Paris'      => [48.8566, 2.3522],
        'Toulouse'   => [43.6047, 1.4442],
    ];

    public function handle(): int
    {
        $email    = trim((string) $this->argument('email'));
        $password = (string) $this->argument('password');
        $city     = (string) $this->option('city');
        $name     = (string) $this->option('name');

        if (strlen($password) < 12) {
            $this->error('Mot de passe trop court : 12 caractères minimum.');
            return 1;
        }

        if (User::where('email', $email)->exists()) {
            $this->error("Un compte existe déjà avec {$email}. Le supprimer avant de relancer.");
            return 1;
        }

        // Uniquement des coiffeurs qui ont au moins une prestation active :
        // sans prestation, impossible de créer un rendez-vous, et la fiche
        // que le reviewer ouvrirait serait vide.
        $pros = HairdresserProfile::whereNotNull('slug')
            ->where('city', $city)
            ->whereHas('services', function ($q) {
                $q->where('is_active', 1);
            })
            ->take(3)
            ->get();

        if ($pros->count() < 3) {
            $this->error("Moins de 3 coiffeurs avec prestations actives à {$city} (trouvés : {$pros->count()}).");
            $this->line('Essaie une autre ville avec --city, ou publie des prestations sur ces profils.');
            return 1;
        }

        [$lat, $lng] = self::CITY_COORDS[$city] ?? [48.5734, 7.7521];

        $user = User::create([
            'name'      => $name,
            'email'     => $email,
            'password'  => bcrypt($password),
            'role'      => 'client',
            'city'      => $city,
            'latitude'  => $lat,
            'longitude' => $lng,
        ]);

        // saved_profiles et follows : clés primaires composites, `created_at`
        // est leur seul horodatage — pas d'id ni d'updated_at.
        foreach ($pros as $pro) {
            DB::table('saved_profiles')->insert([
                'user_id'        => $user->id,
                'hairdresser_id' => $pro->id,
                'created_at'     => now(),
            ]);
        }

        DB::table('follows')->insert([
            'follower_id'    => $user->id,
            'hairdresser_id' => $pros[0]->id,
            'created_at'     => now(),
        ]);
        $pros[0]->increment('followers_count');

        $this->makeAppointment($user, $pros[0], 'confirmed', now()->addDays(10), '10:00', 'Matin');
        $this->makeAppointment($user, $pros[1], 'completed', now()->subDays(20), '15:00', 'Apres-midi');

        $this->line('');
        $this->info('Compte de review créé.');
        $this->line("  id       : {$user->id}");
        $this->line("  email    : {$user->email}");
        $this->line("  ville    : {$city}");
        $this->line('  favoris  : ' . $pros->pluck('slug')->implode(', '));
        $this->line("  abonné à : {$pros[0]->slug}");
        $this->line("  RDV à venir (annulable) chez {$pros[0]->slug}");
        $this->line("  RDV passé (avis possible) chez {$pros[1]->slug}");
        $this->line('');
        $this->line('À reporter dans App Store Connect → App Review Information → Sign-in required.');

        return 0;
    }

    private function makeAppointment(
        User $user,
        HairdresserProfile $pro,
        string $status,
        \Illuminate\Support\Carbon $date,
        string $time,
        string $slot
    ): void {
        $service = $pro->services()->where('is_active', 1)->first();

        Appointment::create([
            'hairdresser_id'   => $pro->id,
            'client_id'        => $user->id,
            'client_name'      => $user->name,
            'client_email'     => $user->email,
            'service_id'       => $service->id,
            'service'          => $service->name,
            'desired_date'     => $date->toDateString(),
            'desired_slot'     => $slot,
            'appointment_date' => $date->toDateString(),
            'appointment_time' => $time,
            'duration_minutes' => $service->duration_minutes,
            'price'            => $service->price,
            'status'           => $status,
        ]);
    }
}
