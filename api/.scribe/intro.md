# Introduction

Besouhola CRM API (Laravel + Sanctum + Multi-tenant)

<aside>
    <strong>Base URL</strong>: <code>http://127.0.0.1:8000</code>
</aside>

This documentation describes the API contract for Besouhola CRM.

### Authentication
Most endpoints require a Sanctum token:

- `Authorization: Bearer <token>`

You can obtain a token via the login endpoint (`POST /api/auth/login` or `POST /api/login`).

### Tenant context
This is a multi-tenant system. For mobile clients, the recommended approach is to send the tenant slug on every request:

- `X-Tenant-Id: <tenant-slug>`

The backend also supports `X-Tenant` as an alias.

