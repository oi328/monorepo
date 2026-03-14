<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AccessLogController extends Controller
{
    public function index(Request $request)
    {
        $authUser = $request->user();
        if (!$authUser) {
            abort(401, 'Unauthorized');
        }

        $tenantId = $authUser->tenant_id;
        if (!$tenantId && !$authUser->is_super_admin) {
            abort(403, 'Tenant context missing');
        }

        $query = DB::table('personal_access_tokens')
            ->join('users', function ($join) {
                $join->on('users.id', '=', 'personal_access_tokens.tokenable_id');
            })
            ->where('personal_access_tokens.tokenable_type', '=', User::class);

        if ($tenantId) {
            $query->where('users.tenant_id', $tenantId);
        }

        $search = $request->input('q');
        if ($search) {
            $like = '%' . $search . '%';
            $query->where(function ($q) use ($like) {
                $q->where('users.name', 'like', $like)
                    ->orWhere('users.email', 'like', $like)
                    ->orWhere('personal_access_tokens.ip_address', 'like', $like)
                    ->orWhere('personal_access_tokens.location', 'like', $like)
                    ->orWhere('personal_access_tokens.user_agent', 'like', $like);
            });
        }

        $query->orderByDesc('personal_access_tokens.created_at');

        $limit = min((int) $request->input('limit', 500), 1000);
        $rows = $query->limit($limit)->get([
            'personal_access_tokens.id',
            'users.name as user_name',
            'personal_access_tokens.created_at',
            'personal_access_tokens.last_used_at',
            'personal_access_tokens.ip_address',
            'personal_access_tokens.location',
            'personal_access_tokens.user_agent',
        ]);

        $data = $rows->map(function ($row) {
            $device = $this->detectDevice($row->user_agent);
            $browser = $this->detectBrowser($row->user_agent);

            return [
                'id' => (int) $row->id,
                'user' => $row->user_name,
                'login' => $this->formatTimestamp($row->created_at),
                'logout' => $this->formatTimestamp($row->last_used_at),
                'ip' => $row->ip_address,
                'location' => $row->location,
                'device' => $device,
                'browser' => $browser,
            ];
        });

        return response()->json($data);
    }

    protected function formatTimestamp($value): ?string
    {
        if (!$value) {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i');
        }

        try {
            return \Carbon\Carbon::parse($value)->format('Y-m-d H:i');
        } catch (\Exception $e) {
            return (string) $value;
        }
    }

    protected function detectDevice(?string $ua): string
    {
        $ua = $ua ?? '';
        $uaLower = strtolower($ua);
        if ($uaLower === '') {
            return 'Unknown';
        }
        if (str_contains($uaLower, 'iphone')) {
            return 'iPhone';
        }
        if (str_contains($uaLower, 'android')) {
            return 'Android';
        }
        if (str_contains($uaLower, 'ipad')) {
            return 'iPad';
        }
        if (str_contains($uaLower, 'macintosh') || str_contains($uaLower, 'mac os')) {
            return 'Mac';
        }
        if (str_contains($uaLower, 'windows')) {
            return 'Windows PC';
        }
        if (str_contains($uaLower, 'linux')) {
            return 'Linux';
        }
        return 'Other';
    }

    protected function detectBrowser(?string $ua): string
    {
        $ua = $ua ?? '';
        $uaLower = strtolower($ua);
        if ($uaLower === '') {
            return 'Unknown';
        }
        if (str_contains($uaLower, 'edge')) {
            return 'Edge';
        }
        if (str_contains($uaLower, 'opr/') || str_contains($uaLower, 'opera')) {
            return 'Opera';
        }
        if (str_contains($uaLower, 'chrome')) {
            return 'Chrome';
        }
        if (str_contains($uaLower, 'safari') && !str_contains($uaLower, 'chrome')) {
            return 'Safari';
        }
        if (str_contains($uaLower, 'firefox')) {
            return 'Firefox';
        }
        return 'Other';
    }
}
