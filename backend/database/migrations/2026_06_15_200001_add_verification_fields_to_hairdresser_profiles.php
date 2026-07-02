<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddVerificationFieldsToHairdresserProfiles extends Migration
{
    public function up()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->boolean('identity_verified')->default(false)->after('is_verified');
            $table->boolean('pro_active_badge')->default(false)->after('identity_verified');
        });
    }

    public function down()
    {
        Schema::table('hairdresser_profiles', function (Blueprint $table) {
            $table->dropColumn(['identity_verified', 'pro_active_badge']);
        });
    }
}
