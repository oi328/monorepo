<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PublicFileController extends Controller
{
    public function show(Request $request, string $path)
    {
        $disk = Storage::disk('public');

        if (!$disk->exists($path)) {
            abort(404);
        }

        $content = $disk->get($path);

        $mime = 'application/octet-stream';
        $fullPath = method_exists($disk, 'path') ? $disk->path($path) : null;
        if ($fullPath && is_file($fullPath)) {
            $detected = function_exists('mime_content_type') ? mime_content_type($fullPath) : null;
            if ($detected) {
                $mime = $detected;
            }
        }

        return response($content, 200, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=31536000',
        ]);
    }
}
