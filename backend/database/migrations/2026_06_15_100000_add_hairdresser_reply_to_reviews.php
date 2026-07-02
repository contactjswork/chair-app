<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddHairdresserReplyToReviews extends Migration
{
    public function up()
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->text('hairdresser_reply')->nullable()->after('comment');
            $table->timestamp('replied_at')->nullable()->after('hairdresser_reply');
        });
    }

    public function down()
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn(['hairdresser_reply', 'replied_at']);
        });
    }
}
