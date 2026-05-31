<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        // Spécialités
        $specialties = [
            ['name' => 'Balayage', 'slug' => 'balayage', 'icon' => '✨', 'category' => 'Couleur'],
            ['name' => 'Blond', 'slug' => 'blond', 'icon' => '💛', 'category' => 'Couleur'],
            ['name' => 'Coloration', 'slug' => 'coloration', 'icon' => '🎨', 'category' => 'Couleur'],
            ['name' => 'Coupe Femme', 'slug' => 'coupe-femme', 'icon' => '✂️', 'category' => 'Coupe'],
            ['name' => 'Coupe Homme', 'slug' => 'coupe-homme', 'icon' => '✂️', 'category' => 'Coupe'],
            ['name' => 'Barber', 'slug' => 'barber', 'icon' => '🪒', 'category' => 'Coupe'],
            ['name' => 'Boucles', 'slug' => 'boucles', 'icon' => '🌀', 'category' => 'Texture'],
            ['name' => 'Extensions', 'slug' => 'extensions', 'icon' => '💇', 'category' => 'Texture'],
            ['name' => 'Ombré Hair', 'slug' => 'ombre-hair', 'icon' => '🌅', 'category' => 'Couleur'],
            ['name' => 'Lissage', 'slug' => 'lissage', 'icon' => '〰️', 'category' => 'Texture'],
            ['name' => 'Mariage', 'slug' => 'mariage', 'icon' => '💍', 'category' => 'Occasion'],
            ['name' => 'Hair Contouring', 'slug' => 'hair-contouring', 'icon' => '🖌️', 'category' => 'Couleur'],
        ];

        foreach ($specialties as $s) {
            \App\Models\Specialty::create(array_merge($s, ['is_active' => true]));
        }

        // Coiffeurs fictifs
        $hairdressersData = [
            [
                'name' => 'Sophie Martin',
                'email' => 'sophie@chair.fr',
                'city' => 'Strasbourg',
                'bio' => 'Spécialiste balayage et colorations naturelles. 8 ans d\'expérience.',
                'tagline' => 'Experte en couleurs naturelles & balayage',
                'specialties' => ['balayage', 'blond', 'ombre-hair'],
                'avg_rating' => 4.9,
                'reviews_count' => 47,
                'followers_count' => 312,
            ],
            [
                'name' => 'Lucas Bernard',
                'email' => 'lucas@chair.fr',
                'city' => 'Strasbourg',
                'bio' => 'Barber certifié, spécialiste coupes homme et taille de barbe.',
                'tagline' => 'Barber — coupes homme & barbier',
                'specialties' => ['barber', 'coupe-homme'],
                'avg_rating' => 4.8,
                'reviews_count' => 89,
                'followers_count' => 578,
            ],
            [
                'name' => 'Amara Diallo',
                'email' => 'amara@chair.fr',
                'city' => 'Paris',
                'bio' => 'Experte en cheveux bouclés et textures afro. Certifiée Ouidad.',
                'tagline' => 'Spécialiste boucles & textures afro',
                'specialties' => ['boucles', 'extensions', 'coloration'],
                'avg_rating' => 5.0,
                'reviews_count' => 63,
                'followers_count' => 891,
            ],
            [
                'name' => 'Clara Petit',
                'email' => 'clara@chair.fr',
                'city' => 'Lyon',
                'bio' => 'Coiffeuse passionnée, spécialiste coupe femme et coiffures de mariée.',
                'tagline' => 'Coupes femme & coiffures de mariée',
                'specialties' => ['coupe-femme', 'mariage', 'coloration'],
                'avg_rating' => 4.7,
                'reviews_count' => 34,
                'followers_count' => 245,
            ],
            [
                'name' => 'Mehdi Razzouk',
                'email' => 'mehdi@chair.fr',
                'city' => 'Colmar',
                'bio' => 'Coloriste expert, spécialiste en hair contouring et ombré hair.',
                'tagline' => 'Coloriste — hair contouring & ombré',
                'specialties' => ['hair-contouring', 'ombre-hair', 'balayage'],
                'avg_rating' => 4.6,
                'reviews_count' => 28,
                'followers_count' => 189,
            ],
        ];

        foreach ($hairdressersData as $index => $data) {
            $user = \App\Models\User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => bcrypt('password'),
                'role' => 'hairdresser',
                'city' => $data['city'],
                'bio' => $data['bio'],
                'avatar' => "https://i.pravatar.cc/150?img=" . ($index + 10),
            ]);

            $profile = \App\Models\HairdresserProfile::create([
                'user_id' => $user->id,
                'slug' => \Illuminate\Support\Str::slug($data['name']),
                'tagline' => $data['tagline'],
                'city' => $data['city'],
                'is_independent' => true,
                'avg_rating' => $data['avg_rating'],
                'reviews_count' => $data['reviews_count'],
                'followers_count' => $data['followers_count'],
                'posts_count' => 3,
                'years_experience' => rand(3, 12),
                'banner_image' => "https://images.unsplash.com/photo-" . ['1522337360788-8b13dee7a37e', '1560066984-138dadb4c035', '1521590832167-7bcbfaa6381f', '1595476589022-7c86ade2c24d', '1487412912498-0447578fcca8'][$index] . "?w=1200&q=80",
            ]);

            $specialtyIds = \App\Models\Specialty::whereIn('slug', $data['specialties'])->pluck('id');
            $profile->specialties()->attach($specialtyIds);

            // Posts fictifs
            for ($p = 0; $p < 3; $p++) {
                \App\Models\Post::create([
                    'hairdresser_id' => $profile->id,
                    'specialty_id' => $specialtyIds->first(),
                    'type' => $p === 0 ? 'before_after' : 'result',
                    'description' => ['Transformation complète — avant/après', 'Balayage naturel réalisé aujourd\'hui', 'Résultat final — cliente ravie'][$p],
                    'duration_minutes' => [120, 90, 60][$p],
                    'price_indication' => [80, 60, 45][$p],
                    'is_published' => true,
                    'cover_image' => "https://images.unsplash.com/photo-" . ['1522337360788-8b13dee7a37e', '1560066984-138dadb4c035', '1521590832167-7bcbfaa6381f', '1595476589022-7c86ade2c24d', '1487412912498-0447578fcca8', '1519699047748-de8e457a634e', '1605497788044-5a32c7078486'][$p % 7] . "?w=800&q=80",
                    'views_count' => rand(50, 500),
                    'likes_count' => rand(10, 100),
                ]);
            }

            // Avis fictifs
            $reviewsData = [
                ['comment' => 'Incroyable ! Exactement ce que je voulais.', 'rating' => 5],
                ['comment' => 'Très professionnel, je recommande vivement.', 'rating' => 5],
                ['comment' => 'Super résultat, ambiance top.', 'rating' => 4],
            ];

            foreach ($reviewsData as $ri => $review) {
                $client = \App\Models\User::create([
                    'name' => ['Marie D.', 'Julie K.', 'Nathalie B.'][$ri],
                    'email' => "client{$index}{$ri}@example.com",
                    'password' => bcrypt('password'),
                    'role' => 'client',
                    'city' => $data['city'],
                ]);

                \App\Models\Review::create([
                    'hairdresser_id' => $profile->id,
                    'client_id' => $client->id,
                    'rating' => $review['rating'],
                    'comment' => $review['comment'],
                    'is_verified' => true,
                ]);
            }
        }
    }
}
