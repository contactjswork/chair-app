<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AddVideoToPostsTable extends Migration
{
    public function up()
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->string('video_url')->nullable()->after('cover_image');
            $table->string('video_thumbnail_url')->nullable()->after('video_url');
            $table->unsignedInteger('video_duration_seconds')->nullable()->after('video_thumbnail_url');
        });

        // Colonne enum stricte — MODIFY direct plutôt que ->change() (évite une
        // dépendance fine à doctrine/dbal pour un simple ajout de valeur).
        DB::statement("ALTER TABLE posts MODIFY COLUMN type ENUM('before_after', 'result', 'technique', 'video') DEFAULT 'result'");
    }

    public function down()
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['video_url', 'video_thumbnail_url', 'video_duration_seconds']);
        });
        DB::statement("ALTER TABLE posts MODIFY COLUMN type ENUM('before_after', 'result', 'technique') DEFAULT 'result'");
    }
}
