<?php

namespace App\Console\Commands;

use App\Models\ChairRental;
use App\Models\HairdresserProfile;
use App\Models\JobOffer;
use App\Models\Post;
use App\Models\PostImage;
use App\Models\Salon;
use App\Models\Service;
use App\Models\Specialty;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

/**
 * Les TROIS comptes de démonstration App Review — un par app (guideline
 * 2.1 : Apple doit pouvoir tout tester) :
 *
 *   review.client@…   → CHAIR          (délégué à chair:create-review-account)
 *   review.coiffeur@… → CHAIR PRO      (profil complet : services, portfolio)
 *   review.gerant@…   → CHAIR BUSINESS (salon complet : équipe, annonce, offre)
 *
 * Le coiffeur de review est rattaché au salon de review : le reviewer
 * BUSINESS voit une équipe, le reviewer PRO voit un salon — les deux mondes
 * se répondent. Les images sont empruntées aux contenus déjà en base
 * (Cloudinary) : aucun upload, aucun binaire embarqué.
 *
 * --fresh : supprime d'abord les comptes de review existants sur ces
 * e-mails (« refais un beau compte preview et dégage les comptes inactifs »,
 * Julien 15/09/2026) — ne touche à RIEN d'autre.
 */
class CreatePreviewAccounts extends Command
{
    protected $signature = 'chair:make-preview-accounts
        {password : Mot de passe commun — à reporter dans App Store Connect}
        {--fresh : Supprime les anciens comptes de review avant de recréer}';

    protected $description = 'Crée les 3 comptes de démonstration App Review (client, coiffeur, gérant)';

    private const EMAIL_CLIENT   = 'review.client@getchair.app';
    private const EMAIL_COIFFEUR = 'review.coiffeur@getchair.app';
    private const EMAIL_GERANT   = 'review.gerant@getchair.app';

    public function handle(): int
    {
        $password = (string) $this->argument('password');

        if ($this->option('fresh')) {
            $this->purgerAnciens();
        }

        foreach ([self::EMAIL_CLIENT, self::EMAIL_COIFFEUR, self::EMAIL_GERANT] as $email) {
            if (User::where('email', $email)->exists()) {
                $this->error("{$email} existe déjà — relancez avec --fresh pour repartir propre.");
                return 1;
            }
        }

        // ── Le gérant + son salon ────────────────────────────────────────
        $gerant = User::forceCreate([
            'name'     => 'Claire Dumont',
            'email'    => self::EMAIL_GERANT,
            'password' => bcrypt($password),
            'role'     => 'salon_owner',
            'city'     => 'Strasbourg',
            'latitude' => 48.5734, 'longitude' => 7.7521,
            'email_verified_at' => now(),
        ]);

        $salon = Salon::create([
            'owner_id'  => $gerant->id,
            'name'      => 'Atelier Dumont',
            'slug'      => $this->slugLibre(Salon::class, 'atelier-dumont'),
            'description' => "Salon de coiffure au cœur de Strasbourg — coupes, couleurs et soins, dans une ambiance atelier.",
            'address'   => '4 rue des Orfèvres',
            'city'      => 'Strasbourg',
            'postal_code' => '67000',
            'region'    => 'Grand Est',
            'department' => 'Bas-Rhin',
            'latitude'  => 48.5819, 'longitude' => 7.7480,
            'logo'      => Salon::whereNotNull('logo')->value('logo'),
            'cover_image' => Salon::whereNotNull('cover_image')->value('cover_image'),
        ]);

        // ── Le coiffeur, rattaché au salon ───────────────────────────────
        $coiffeur = User::forceCreate([
            'name'     => 'Hugo Lambert',
            'email'    => self::EMAIL_COIFFEUR,
            'password' => bcrypt($password),
            'role'     => 'hairdresser',
            'city'     => 'Strasbourg',
            'latitude' => 48.5734, 'longitude' => 7.7521,
            'email_verified_at' => now(),
            'avatar'   => User::whereNotNull('avatar')->where('role', 'hairdresser')->value('avatar'),
        ]);

        $profil = HairdresserProfile::create([
            'user_id'        => $coiffeur->id,
            'slug'           => $this->slugLibre(HairdresserProfile::class, 'hugo-lambert'),
            'tagline'        => 'Le détail qui change tout.',
            'city'           => 'Strasbourg',
            'postal_code'    => '67000',
            'region'         => 'Grand Est',
            'department'     => 'Bas-Rhin',
            'latitude'       => 48.5822, 'longitude' => 7.7465,
            'is_independent' => false,
            'salon_id'       => $salon->id,
            'years_experience' => 8,
            'banner_image'   => HairdresserProfile::whereNotNull('banner_image')->value('banner_image'),
        ]);

        // Services réels (3), rattachés aux vraies spécialités.
        $specialites = Specialty::whereIn('slug', ['coupe-homme', 'couleur-balayage', 'barbe'])->get()->keyBy('slug');
        foreach ([
            ['name' => 'Coupe homme',        'price' => 28, 'duration_minutes' => 30, 'slug' => 'coupe-homme'],
            ['name' => 'Balayage complet',   'price' => 95, 'duration_minutes' => 120, 'slug' => 'couleur-balayage'],
            ['name' => 'Taille de barbe',    'price' => 18, 'duration_minutes' => 20, 'slug' => 'barbe'],
        ] as $svc) {
            Service::create([
                'hairdresser_id'   => $profil->id,
                'category_id'      => \App\Models\ServiceCategory::value('id'),
                'specialty_id'     => $specialites[$svc['slug']]->id ?? null,
                'name'             => $svc['name'],
                'price'            => $svc['price'],
                'duration_minutes' => $svc['duration_minutes'],
                'is_active'        => true,
            ]);
        }

        // Portfolio : 3 réalisations, images empruntées aux posts existants.
        $imagesDemo = PostImage::orderByDesc('id')->limit(3)->pluck('url');
        foreach ($imagesDemo as $i => $url) {
            $post = Post::create([
                'hairdresser_id' => $profil->id,
                'specialty_id'   => $specialites['coupe-homme']->id ?? null,
                'type'           => 'result',
                'description'    => ['Dégradé net, finition rasoir.', 'Balayage caramel sur base châtain.', 'Coupe texturée + barbe sculptée.'][$i] ?? 'Réalisation',
                'is_published'   => true,
            ]);
            PostImage::create(['post_id' => $post->id, 'url' => $url, 'type' => 'result', 'order' => 0]);
        }
        $profil->update(['posts_count' => count($imagesDemo)]);

        // ── Le salon a de la vie : une annonce fauteuil + une offre ──────
        ChairRental::create([
            'salon_id'      => $salon->id,
            'space_type'    => 'chair',
            'title'         => 'Fauteuil lumineux — Atelier Dumont',
            'slug'          => ChairRental::generateUniqueSlug('Fauteuil lumineux — Atelier Dumont'),
            'description'   => 'Poste complet dans un salon vivant du centre : bac, rangement fermé, clientèle de passage.',
            'city'          => 'Strasbourg',
            'latitude'      => 48.5819, 'longitude' => 7.7480,
            'price_per_day' => 40, 'price_per_week' => 170, 'price_per_month' => 550,
            'available_days' => [1, 2, 3, 4, 5],
            'equipment'     => ['mirror', 'sink', 'storage', 'wifi', 'city_center'],
            'insurance_required' => true,
            'status'        => 'available',
            'published_at'  => now(),
        ]);

        JobOffer::create([
            'salon_id'      => $salon->id,
            'title'         => 'Coiffeur(se) polyvalent(e) — CDI',
            'job_type'      => 'hairdresser',
            'contract_type' => 'cdi',
            'description'   => 'Nous cherchons un(e) coiffeur(se) confirmé(e) pour rejoindre une équipe soudée. Clientèle fidèle, matériel fourni.',
            'city'          => 'Strasbourg',
            'status'        => 'open',
        ]);

        // ── Le client — la commande existante fait déjà tout bien ────────
        Artisan::call('chair:create-review-account', [
            'email'    => self::EMAIL_CLIENT,
            'password' => $password,
            '--city'   => 'Strasbourg',
            '--name'   => 'Camille Petit',
        ], $this->output);

        $this->newLine();
        $this->info('Comptes App Review prêts (mot de passe commun fourni) :');
        $this->table(['App', 'E-mail', 'Contenu'], [
            ['CHAIR',          self::EMAIL_CLIENT,   'favoris, abonnement, RDV à annuler, RDV à noter'],
            ['CHAIR PRO',      self::EMAIL_COIFFEUR, '3 services, 3 réalisations, rattaché à Atelier Dumont'],
            ['CHAIR BUSINESS', self::EMAIL_GERANT,   'salon complet, 1 coiffeur, 1 annonce fauteuil, 1 offre'],
        ]);

        return 0;
    }

    /** Supprime les anciens comptes de review (et leurs contenus, en cascade). */
    private function purgerAnciens(): void
    {
        foreach ([self::EMAIL_CLIENT, self::EMAIL_COIFFEUR, self::EMAIL_GERANT] as $email) {
            $user = User::where('email', $email)->first();
            if (!$user) {
                continue;
            }
            // Salon du gérant d'abord (annonces/offres en cascade via FK).
            Salon::where('owner_id', $user->id)->get()->each->delete();
            HairdresserProfile::where('user_id', $user->id)->get()->each->delete();
            $user->tokens()->delete();
            $user->delete();
            $this->line("Ancien compte supprimé : {$email}");
        }
    }

    private function slugLibre(string $modele, string $base): string
    {
        $slug = $base;
        $i = 1;
        while ($modele::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $i++;
        }
        return $slug;
    }
}
