<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CrmSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CrmSettingsController extends Controller
{
    protected function defaults(): array
    {
        return [
            'requestApprovals' => false,
            'duplicationSystem' => true,
            'allowDuplicateProjects' => false,
            'allowDuplicateProperties' => false,
            'allowCustomerPaymentPlan' => true,
            'showBroker' => true,
            'showDeveloper' => true,
            'showColdCallsStage' => true,
            'showMobileNumber' => true,
            'startUnitCode' => '1000',
            'startCustomerCode' => '1000',
            'startInvoiceCode' => '1000',
            'startOrderCode' => '1000',
            'startQuotationCode' => '1000',
            'allowConvertToCustomers' => true,
            'enableTwoFactorAuth' => false,
            'defaultCountryCode' => 'EG',
            'defaultCurrency' => 'EGP',
            'timeZone' => 'Africa/Cairo',
            'dateFormat' => 'DD/MM/YYYY',
            'timeFormat' => '24h',
            'numberFormat' => '1,234.56',
            'animations' => true,
            'sidebarCollapsible' => true,
            'allowTimeline' => true,
            'allowCallLog' => true,
        ];
    }

    public function show(Request $request)
    {
        try {
            if (Schema::hasTable('crm_settings')) {
                $record = CrmSetting::first();
                $settings = $record && is_array($record->settings) ? $record->settings : $this->defaults();
                return response()->json(['settings' => $settings]);
            }
        } catch (\Throwable $e) {}
        return response()->json(['settings' => $this->defaults()]);
    }

    public function update(Request $request)
    {
        $payload = $request->input('settings', $request->all());
        if (!is_array($payload)) {
            return response()->json(['message' => 'Invalid settings payload'], 422);
        }
        if (!Schema::hasTable('crm_settings')) {
            $next = array_merge($this->defaults(), $payload);
            return response()->json(['settings' => $next, 'message' => 'Settings storage not ready'], 200);
        }
        $record = CrmSetting::first() ?? new CrmSetting();
        $previous = $record->settings ?? $this->defaults();
        $next = array_merge($this->defaults(), $payload);
        $record->settings = $next;
        $record->save();

        // If global 2FA is disabled, force-disable it for all users in this tenant
        if (isset($next['enableTwoFactorAuth']) && $next['enableTwoFactorAuth'] === false) {
            DB::transaction(function () {
                $users = User::query()->get();
                foreach ($users as $user) {
                    $sec = is_array($user->security_settings) ? $user->security_settings : [];
                    $sec['two_factor_auth'] = false;
                    $user->security_settings = $sec;
                    $user->two_factor_code = null;
                    $user->two_factor_expires_at = null;
                    $user->saveQuietly();
                }
            });
        }

        return response()->json(['settings' => $record->settings]);
    }
}
