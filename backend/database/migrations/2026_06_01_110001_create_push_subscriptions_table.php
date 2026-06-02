<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePushSubscriptionsTable extends Migration
{
    public function up()
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('platform')->nullable(); // ios, android, web
            $table->string('provider')->nullable(); // firebase, onesignal
            $table->string('token', 512)->nullable();
            $table->boolean('enabled')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            $table->index('user_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('push_subscriptions');
    }
}
