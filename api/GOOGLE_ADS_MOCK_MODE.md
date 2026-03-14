# Google Ads Mock Mode (Enterprise Internal Test Mode)

This module provides a full simulation of the Google Ads API for development and QA environments. It allows testing of multi-tenant, multi-account integrations without connecting to real Google Ads accounts or incurring API costs.

## Features

- **Multi-Tenant & Multi-Account Support**: Each tenant can connect multiple mock Google Ads accounts.
- **Mock Data Generation**: Generates realistic campaigns, leads, and performance metrics.
- **Failure Simulation**: Simulates network timeouts, rate limits, and token expirations based on configuration.
- **Queue Integration**: Processes sync jobs through the standard Laravel queue system with retry logic.
- **Isolated Logging**: Logs all mock activities to `storage/logs/google_ads_mock.log`.

## Configuration

Enable Mock Mode in your `.env` file:

```env
GOOGLE_ADS_MOCK_MODE=true
GOOGLE_ADS_MOCK_ON_LOCAL=true

# Simulation Parameters
GOOGLE_ADS_MOCK_RATE_LIMIT=50
GOOGLE_ADS_MOCK_FAILURE_PROBABILITY=0.1  # 10% chance of failure
GOOGLE_ADS_MOCK_TOKEN_EXPIRE_MIN=5       # Tokens expire after 5 minutes
```

## Architecture

### Database
- **`google_ads_accounts`**: Stores account credentials and mock status.
  - `tenant_id`: Links to the tenant.
  - `is_mock`: Flag to indicate if the account is a simulation.

### Service Layer
- **`GoogleAdsServiceInterface`**: Contract for Google Ads operations (`getCampaigns`, `getLeads`).
- **`RealGoogleAdsService`**: Implementation for production (calls Google Ads API).
- **`MockGoogleAdsService`**: Implementation for testing (generates fake data).
- **`AppServiceProvider`**: Binds the interface to the correct implementation based on config.

### Queue Jobs
- **`SyncGoogleAccount`**: Handles the synchronization of campaigns and leads for a single account.
  - Retries automatically on failure (simulated or real).
  - Logs activity to `google_ads_mock` channel.

## API Endpoints

### Management
- `POST /api/tenant/{tenant_id}/google-ads/connect` - Connect a new account (Mock or Real).
- `GET /api/tenant/{tenant_id}/google-ads/accounts` - List connected accounts.
- `DELETE /api/tenant/{tenant_id}/google-ads/{account_id}` - Disconnect an account.

### Data Retrieval
- `GET /api/tenant/{tenant_id}/google-ads/{account_id}/campaigns` - Get campaigns.
- `GET /api/tenant/{tenant_id}/google-ads/{account_id}/leads` - Get leads.

### Mock Triggers (Test Only)
- `POST /api/mock/tenant/{tenant_id}/google-ads/{account_id}/campaigns?count=5` - Trigger sync and generate 5 mock campaigns.
- `POST /api/mock/tenant/{tenant_id}/google-ads/{account_id}/leads?count=10` - Trigger sync and generate 10 mock leads.

## Running Tests

Run the integration tests to verify Mock Mode behavior:

```bash
php artisan test tests/Feature/GoogleAdsMockTest.php
```
