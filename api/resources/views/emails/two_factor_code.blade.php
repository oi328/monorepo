<x-mail::message>
# Login Verification Code
# رمز التحقق للدخول

Hello {{ $user->name }},
مرحباً {{ $user->name }}،

Your login verification code is:
رمز التحقق الخاص بك هو:

# {{ $code }}

This code will expire in 10 minutes.
تنتهي صلاحية هذا الرمز خلال 10 دقائق.

If you did not attempt to login, please change your password immediately.
إذا لم تحاول تسجيل الدخول، يرجى تغيير كلمة المرور فوراً.

Thanks,
شكراً،<br>
{{ config('app.name') }}
</x-mail::message>
