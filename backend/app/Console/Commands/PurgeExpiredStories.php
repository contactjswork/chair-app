<?php

namespace App\Console\Commands;

use App\Services\StoryService;
use Illuminate\Console\Command;

/**
 * Supprime les stories expirées (>24h) et leur média Cloudinary.
 * Usage : php artisan chair:purge-expired-stories
 */
class PurgeExpiredStories extends Command
{
    protected $signature   = 'chair:purge-expired-stories';
    protected $description = 'Supprime les stories expirées et leur média Cloudinary';

    public function handle(): int
    {
        $count = StoryService::purgeExpired();
        $this->info("{$count} story(ies) expirée(s) supprimée(s).");
        return 0;
    }
}
