<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('chair_rentals', function (Blueprint $table) {
            $table->string('space_type', 30)->nullable()->after('salon_id');
            $table->string('slug')->nullable()->unique()->after('title');
            $table->string('address')->nullable()->after('slug');
            $table->string('city')->nullable()->after('address');
            $table->decimal('latitude', 10, 7)->nullable()->after('city');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->text('access_instructions')->nullable()->after('longitude');
            $table->decimal('deposit_amount', 8, 2)->nullable()->after('price_per_month');
            $table->json('blocked_dates')->nullable()->after('end_date');
            $table->boolean('insurance_required')->default(true)->after('conditions');
            $table->text('insurance_notes')->nullable()->after('insurance_required');
            $table->text('products_policy')->nullable()->after('insurance_notes');
            $table->timestamp('published_at')->nullable()->after('status');
            $table->index(['salon_id', 'status']);
        });

        // Aucune valeur libre existante à préserver (vérifié : 0 ligne avec un
        // equipment non vide) — le champ passe d'un texte libre à un tableau
        // de clés de la taxonomie fixe (ChairRental::EQUIPMENT_OPTIONS).
        DB::table('chair_rentals')->update(['equipment' => null]);
        DB::statement('ALTER TABLE chair_rentals MODIFY COLUMN equipment JSON NULL');

        DB::statement("ALTER TABLE chair_rentals MODIFY COLUMN status ENUM('draft','available','rented','disabled') NOT NULL DEFAULT 'draft'");

        DB::statement("ALTER TABLE chair_rental_requests MODIFY COLUMN status ENUM('pending','in_discussion','accepted','declined','cancelled') NOT NULL DEFAULT 'pending'");

        Schema::create('chair_rental_request_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chair_rental_request_id')->constrained('chair_rental_requests')->onDelete('cascade');
            $table->enum('sender_type', ['owner', 'hairdresser']);
            $table->text('body');
            $table->timestamps();
        });

        // Backfill slug pour les annonces déjà existantes (créées avant cette
        // colonne) — sinon elles restent injoignables via /fauteuil/{slug}.
        \App\Models\ChairRental::whereNull('slug')->get()->each(function ($rental) {
            $rental->update(['slug' => \App\Models\ChairRental::generateUniqueSlug($rental->title, $rental->id)]);
        });
    }

    public function down()
    {
        Schema::dropIfExists('chair_rental_request_messages');

        DB::statement("ALTER TABLE chair_rental_requests MODIFY COLUMN status ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending'");
        DB::statement("ALTER TABLE chair_rentals MODIFY COLUMN status ENUM('available','rented','disabled') NOT NULL DEFAULT 'available'");
        DB::statement('ALTER TABLE chair_rentals MODIFY COLUMN equipment TEXT NULL');

        Schema::table('chair_rentals', function (Blueprint $table) {
            $table->dropIndex(['salon_id', 'status']);
            $table->dropColumn([
                'space_type', 'slug', 'address', 'city', 'latitude', 'longitude',
                'access_instructions', 'deposit_amount', 'blocked_dates',
                'insurance_required', 'insurance_notes', 'products_policy', 'published_at',
            ]);
        });
    }
};
