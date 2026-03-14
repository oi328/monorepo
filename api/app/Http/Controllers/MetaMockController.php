<?php

namespace App\Http\Controllers;

use App\Services\Meta\MetaMockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MetaMockController extends Controller
{
    protected $mockService;

    public function __construct(MetaMockService $mockService)
    {
        $this->mockService = $mockService;
    }

    public function triggerMockLead(Request $request, $pageId)
    {
        if (!config('services.meta.mock_mode')) {
            return response()->json(['error' => 'Mock mode is disabled'], 403);
        }

        try {
            $count = $request->query('count', 1);
            
            // Use the new method that accepts pageId directly
            $results = $this->mockService->dispatchMockLeadsForPage($pageId, (int) $count);
            
            return response()->json([
                'message' => "Dispatched {$count} mock leads for page {$pageId}",
                'results' => $results
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to trigger mock lead: " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
