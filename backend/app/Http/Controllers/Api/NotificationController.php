<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications
     * ?all=true → toutes les notifications (centre de notifications)
     * sans param  → non lues seulement + unread_count (badge polling)
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        if ($request->boolean('all')) {
            $notifications = Notification::where('user_id', $userId)
                ->orderByDesc('created_at')
                ->limit(50)
                ->get();

            $unreadCount = Notification::where('user_id', $userId)
                ->whereNull('read_at')
                ->count();

            return response()->json([
                'notifications' => $notifications,
                'unread_count'  => $unreadCount,
            ]);
        }

        // Badge polling : retourne les non lues + le compteur
        $notifications = Notification::where('user_id', $userId)
            ->whereNull('read_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $notifications->count(),
        ]);
    }

    /**
     * POST /api/notifications/{id}/read
     */
    public function markRead(Request $request, int $id)
    {
        $notification = Notification::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $notification->read_at = now();
        $notification->save();

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/notifications/read-all
     */
    public function markAllRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }
}
