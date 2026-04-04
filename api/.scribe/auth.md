# Authenticating requests

To authenticate requests, include an **`Authorization`** header with the value **`"Bearer {BEARER_TOKEN}"`**.

All authenticated endpoints are marked with a `requires authentication` badge in the documentation below.

Get a token by calling <code>POST /api/auth/login</code> (tenant) or <code>POST /api/login</code> (central), then send it as <code>Authorization: Bearer ...</code>. For tenant-scoped requests, also send <code>X-Tenant-Id</code>.
