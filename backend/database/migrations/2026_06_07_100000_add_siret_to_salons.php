<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddSiretToSalons extends Migration
{
    public function up()
    {
        Schema::table('salons', function (Blueprint $table) {
            $table->string('siret', 14)->nullable()->after('is_verified');
            $table->enum('verification_status', ['unverified', 'pending_review', 'verified', 'rejected'])
                  ->default('unverified')
                  ->after('siret');
        });
    }

    public function down()
    {
        Schema::table('salons', function (Blueprint $table) {
            $table->dropColumn(['siret', 'verification_status']);
        });
    }
}
