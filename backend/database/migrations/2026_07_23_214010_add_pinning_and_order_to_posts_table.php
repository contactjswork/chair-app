<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddPinningAndOrderToPostsTable extends Migration
{
    public function up()
    {
        Schema::table('posts', function (Blueprint $table) {
            // Épingler une réalisation en tête de portfolio (max géré côté
            // applicatif, pas en base) + ordre manuel une fois épinglées.
            $table->boolean('is_pinned')->default(false)->after('is_published');
            $table->unsignedInteger('display_order')->default(0)->after('is_pinned');
        });
    }

    public function down()
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['is_pinned', 'display_order']);
        });
    }
}
