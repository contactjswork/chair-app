<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateHairdresserProfilesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('hairdresser_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->foreignId('salon_id')->nullable()->constrained('salons')->nullOnDelete();
            $table->string('slug')->unique();
            $table->string('banner_image')->nullable();
            $table->string('tagline')->nullable();
            $table->integer('years_experience')->default(0);
            $table->string('diploma')->nullable();
            $table->string('city');
            $table->string('postal_code')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('is_independent')->default(false);
            $table->boolean('is_verified')->default(false);
            $table->unsignedInteger('followers_count')->default(0);
            $table->unsignedInteger('posts_count')->default(0);
            $table->decimal('avg_rating', 3, 2)->default(0);
            $table->unsignedInteger('reviews_count')->default(0);
            $table->string('instagram_url')->nullable();
            $table->string('tiktok_url')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('hairdresser_profiles');
    }
}
