# Flutter Handoff (Besouhola CRM)

## 1) المشروع معمول بإيه؟

- Backend: Laravel + Laravel Sanctum (Token-based auth).
- Multi-tenant: كل شركة/عميل ليه `tenant` (slug)؛ والـ API بيربط الطلب بالـ tenant إمّا من الـ subdomain أو من Header.
- Realtime: Laravel Reverb موجود في `.env.example` و `docker-compose.yml` (اختياري للموبايل حسب احتياج الشاشات).

## 2) إزاي الموبايل يحدد الـ Tenant؟

أبسط وأضمن طريقة للموبايل:

- ابعت Header: `X-Tenant-Id: <tenant-slug>` (برضه مقبول `X-Tenant`).

الـ backend بيحلّ الـ tenant كالتالي (حسب `api/app/Http/Middleware/ResolveTenant.php`):

1. `X-Tenant` / `X-Tenant-Id`
2. Origin host (للـ browser)
3. من `request->user()->tenant_id` (لو الـ API شغال على `api.*`)
4. من subdomain في الـ Host

## 3) Auth (تسجيل الدخول) للموبايل

### Headers ثابتة في كل طلب (بعد اللوجين)

- `Accept: application/json`
- `Authorization: Bearer <token>`
- `X-Tenant-Id: <tenant-slug>` (مستحسن تفضل موجودة دايمًا)

### Mobile Login (قرار نهائي للموبايل)

الموبايل **لازم** يستخدم tenant-based login:

- `POST /api/auth/login` مع `X-Tenant-Id`

ومتعتمدش على central login (`POST /api/login`) إلا لو بتبني flow خاص بالويب/الريديركت.

### Login — Tenant Context (مستحسن)

`POST /api/auth/login`

Body:

```json
{ "email": "user@x.com", "password": "******" }
```

Headers:

```http
X-Tenant-Id: tenant-slug
Accept: application/json
```

Response (مختصر):

```json
{
  "token": "plain_text_sanctum_token",
  "user": { },
  "tenant": { },
  "enabled_modules": [ ],
  "user_permissions": [ ],
  "redirect_url": "https://<tenant>.besouholacrm.net"
}
```

### 2FA (لو مفعّلة)

لو `/api/auth/login` رجّع:

```json
{ "requires_2fa": true }
```

استخدم:

`POST /api/auth/2fa/verify` بنفس فكرة `X-Tenant-Id`

Body:

```json
{ "email": "user@x.com", "code": "123456" }
```

### Login — Central (للوثائق فقط)

فيه `POST /api/login` (Central). سيبه للويب/الـ redirect flows، **مش للموبايل**.

## 4) Endpoints مهمة للموبايل (مبدئيًا)

من `api/routes/api.php`:

- Auth: `POST /api/auth/login`, `POST /api/auth/2fa/verify`, `POST /api/logout`
- Profile: `GET /api/profile`, `POST /api/profile`, sessions revoke
- Notifications: list/unread/mark-read/archive/delete
- Leads/CRM: موجود Controllers كتير (Leads, Customers, Opportunities, Quotations…)

مرجع عملي ممتاز لمبرمج Flutter:

- `frontend/src/utils/api.js` (إزاي الويب بيبعت `Authorization` و `X-Tenant-Id`)
- `frontend/src/services/*.js` (أسماء الـ endpoints والـ payloads حسب كل Feature)

لو محتاجين قائمة كاملة بالـ routes، شغّل السكربت: `docs/extract-api-routes.ps1`.

## 4.1) `GET /api/me` (أهم endpoint للموبايل)

الموبايل أول ما يفتح بعد تخزين التوكن ينادي:

- `GET /api/me`

وده بيرجع:

- `user` (ومن ضمنه `role` لو موجود في الـ model)
- `tenant`
- `enabled_modules`
- `subscription_plan`
- `user_permissions` (قائمة أسماء صلاحيات Spatie)

استخدم `user_permissions` عشان تظبط الـ UI (إظهار/إخفاء actions) بس **دايمًا خليك معتمد على الباك** لو رجّع 403.

## 5) Permissions & Behavior Rules

### Permission keys (موجودة فعليًا في الكود)

- `view-all-leads`
  - يسمح برؤية leads غير المعيّنة للمستخدم (غير owner / غير assigned)
- `view-duplicate-leads`
  - يسمح برؤية/التعامل مع leads المعلّمة كـ duplicate حسب إعدادات النظام
- `act-on-duplicate-leads`
  - يسمح بتنفيذ actions على duplicates (مثلاً تحويل/دمج حسب الـ flow)
- `delete-lead`
  - يسمح بحذف lead (لو الـ business logic/role تسمح)
- `view-reports`
  - يسمح بفتح بعض شاشات/تقارير الـ dashboard/reports

> القائمة الكاملة للصلاحيات لازم تؤخذ من `user_permissions` في `/api/me` و/أو login response.

### Behavior notes (مهم للموبايل)

- الـ lead visibility مش guaranteed: ممكن المستخدم يشوف assigned/created فقط، أو كل الـ leads حسب `view-all-leads` والسياسات.
- في حالات referral: بعض العمليات ممنوعة (مثلاً update/delete/action) حسب Policy.
- الـ backend هو مصدر الحقيقة: حتى لو UI مخفي زر، لازم تتعامل مع رد `403` بشكل طبيعي.

## 5) Files (صور/مستندات) و Signed URLs

الـ backend بيرجع URLs موقعة للفايلات (صالحة ~60 دقيقة) عبر `TenantStorageService`.

- مسار الخدمة: `GET /api/files/{path}` (لازم signature في الـ query).
- فيه كمان: `GET /api/public-files/{path}` لملفات public disk (للـ exports).

مهم للموبايل:

- اعتبر URL اللي جاي من الـ API جاهز للاستخدام مباشرة (Image/Download).
- متحاولش تعمل URL من عندك بالـ path.

## 5.1) Imports (Legacy vs Import Jobs)

### Legacy (Excel upload)

موجود endpoints قديمة للاستيراد (Excel) — غالبًا للويب:

- `POST /api/imports/leads/excel`
- `POST /api/import` (alias)

### Import Jobs (New system — feature-flagged)

فيه نظام جديد للاستيراد على شكل jobs + مراجعة، لكنه **متوقف افتراضيًا**.

- التفعيل (Backend): `IMPORT_JOBS_ENABLED=true` (في Laravel env)
- ملاحظة: لو مش مفعّل هترجع endpoints `404`.

Endpoints:

- `GET /api/import-jobs` (filters: `module`, `status`, `date_from`, `date_to`, `per_page`)
- `POST /api/import-jobs` (JSON rows؛ Phase A يدعم `module=leads` فقط)
- `GET /api/import-jobs/{id}`
- `GET /api/import-jobs/{id}/rows` (filters: `status`, `search`, `per_page`)
- `GET /api/import-jobs/{id}/reviewed-file` (params: `issues_only`, `max_rows`) → بيرجع ملف Excel للمراجعة

قرار المنتج للموبايل (حالياً):

- Imports خارج الـ MVP للموبايل. لو مطلوب لاحقًا، هنفتح Scope مستقل ونحدد UX + حجم البيانات + offline/timeout handling.

## 6) Realtime (اختياري)

فيه `Broadcast::routes()` جوّه protected group؛ لو هنعمل realtime في الموبايل:

- الـ auth للـ channels بيتم عبر `/api/broadcasting/auth` بنفس headers بتاعة Sanctum + `X-Tenant-Id`.
- Reverb settings موجودة في `api/.env.example` و `api/docker-compose.yml`.

## 7) تجهيزات لازم تجهزها لمبرمج Flutter (Checklist)

- Base URLs للـ environments (Dev/Staging/Prod) + root domain النهائي.
- Tenant strategy واضحة:
  - يا إمّا شاشة "Workspace" (slug) + `X-Tenant-Id`
  - أو Central login الأول ثم استنتاج tenant من response
- Accounts جاهزة للاختبار:
  - Tenant slug(s)
  - Users بأدوار مختلفة + صلاحيات مختلفة
  - حالة 2FA on/off (لو مطلوبة)
- Scope للموبايل (MVP):
  - أول إصدار: Login + Leads + Notifications + Profile
  - وبعدين: Pipeline / Opportunities / Reports… حسب الأولوية
- Assets/Branding:
  - App name، ألوان، لوجو، أيقونات، Splash
- Policies:
  - Session expiry / logout behavior
  - Handling subscription_expired (بيرجع `403` مع `code=subscription_expired` في بعض الحالات)

## 7.1) Mobile MVP Scope (Phase 1)

Included:

- Login (tenant-based) + 2FA
- `GET /api/me` (profile + permissions)
- Leads list + lead details
- Create/edit lead (حسب الصلاحيات)
- Lead actions (notes/calls/actions) (حسب الصلاحيات)
- Notifications (list + unread + mark read)

Excluded (Phase 2+):

- Tasks
- Imports / Import Jobs
- Reports (إلا لو مطلوب في الـ MVP)
- Inventory / ERP / Integrations
- Admin settings / super-admin

## 7.2) Error Handling (HTTP)

- `401` → Unauthenticated (token missing/expired)
- `403` → Forbidden (no permission) أو `code=subscription_expired`
- `422` → Validation error
- `404` → Not found
  - ملحوظة: `Import Jobs` بيرجع `404` لو feature flag `IMPORT_JOBS_ENABLED` مقفول.

مهم: ما تفترضش إن كل errors لها نفس shape؛ اعرض `message` إن وُجد.

## 8) API Contract (OpenAPI + Postman) من نفس كود Laravel

الـ backend مفعّل عليه Scribe وبيولّد:

- صفحة docs: `GET /docs`
- OpenAPI spec: `GET /docs.openapi`
- Postman collection: `GET /docs.postman`

توليد الملفات محليًا:

```powershell
cd D:\fullstack\besouhola v1 copy\api
php artisan scribe:generate
```

الملفات بتتولد هنا:

- `D:\fullstack\besouhola v1 copy\api\storage\app\private\scribe\openapi.yaml`
- `D:\fullstack\besouhola v1 copy\api\storage\app\private\scribe\collection.json`
