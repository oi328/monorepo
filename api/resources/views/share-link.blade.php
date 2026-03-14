<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ $title }}</title>
    <meta name="description" content="{{ $description }}" />
    <meta name="robots" content="noindex, nofollow" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="{{ $url }}" />
    <meta property="og:title" content="{{ $title }}" />
    <meta property="og:description" content="{{ $description }}" />
    @if (!empty($image))
      <meta property="og:image" content="{{ $image }}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content="{{ $image }}" />
    @else
      <meta name="twitter:card" content="summary" />
    @endif
    <meta name="twitter:title" content="{{ $title }}" />
    <meta name="twitter:description" content="{{ $description }}" />
    @if (!empty($redirectUrl))
      <meta http-equiv="refresh" content="0;url={{ $redirectUrl }}" />
    @endif
  </head>
  <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px;">
    <div style="max-width: 720px; margin: 0 auto;">
      <h1 style="margin: 0 0 12px; font-size: 20px;">{{ $title }}</h1>
      <p style="margin: 0 0 16px; color: #555;">{{ $description }}</p>
      @if (!empty($redirectUrl))
        <a href="{{ $redirectUrl }}" style="display: inline-block; padding: 10px 14px; background: #1d4ed8; color: #fff; text-decoration: none; border-radius: 10px;">
          Open
        </a>
      @endif
    </div>
  </body>
</html>
