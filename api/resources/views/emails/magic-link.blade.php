<x-mail::message>
# Login to Besouhoula

Click the button below to log in instantly. This link will expire in 15 minutes.

<x-mail::button :url="$url">
Login Now
</x-mail::button>

If you did not request this email, please ignore it.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
