<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use Illuminate\Http\Request;

class AdminAuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AdminAuditLog::with('admin:id,name,email')->orderByDesc('created_at');

        if ($adminId = $request->get('admin_id')) {
            $query->where('admin_id', $adminId);
        }

        if ($resourceType = $request->get('resource_type')) {
            $query->where('resource_type', $resourceType);
        }

        if ($action = $request->get('action')) {
            $query->where('action', 'like', "%{$action}%");
        }

        $logs = $query->paginate((int) $request->get('per_page', 30));

        return response()->json($logs);
    }
}
