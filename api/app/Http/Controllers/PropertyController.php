<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\Entity;
use App\Models\FieldValue;
use App\Models\CrmSetting;
use App\Traits\InventoryDeleteAuthorization;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class PropertyController extends Controller
{
    use InventoryDeleteAuthorization;

    private function normalizeJsonPayload(array $data): array
    {
        $jsonFields = [
            'meta_data',
            'amenities',
            'images',
            'floor_plans',
            'documents',
            'nearby',
            'installment_plans',
            'cil_attachments',
        ];

        $propertyModel = new Property();
        $casts = method_exists($propertyModel, 'getCasts') ? $propertyModel->getCasts() : [];
        $stringArrayFields = ['images', 'floor_plans', 'documents', 'cil_attachments'];

        $extractStrings = function ($value) use (&$extractStrings) {
            $out = [];
            if (is_string($value)) {
                $v = trim($value);
                return $v === '' ? [] : [$v];
            }
            if (!is_array($value)) {
                return [];
            }
            foreach ($value as $item) {
                if (is_string($item)) {
                    $v = trim($item);
                    if ($v !== '') $out[] = $v;
                } elseif (is_array($item)) {
                    $out = array_merge($out, $extractStrings($item));
                }
            }
            return $out;
        };

        foreach ($jsonFields as $field) {
            if (!array_key_exists($field, $data) || $data[$field] === null) {
                continue;
            }

            $val = $data[$field];

            if (is_string($val)) {
                $trimmed = trim($val);
                if ($trimmed !== '' && (str_starts_with($trimmed, '[') || str_starts_with($trimmed, '{'))) {
                    $decoded = json_decode($trimmed, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $val = $decoded;
                    }
                }
            }

            if (in_array($field, $stringArrayFields, true) && is_array($val)) {
                $val = $extractStrings($val);
            }

            $hasCast = array_key_exists($field, $casts);

            if ($hasCast) {
                if (is_array($val)) {
                    $data[$field] = $val;
                } elseif (is_object($val)) {
                    $data[$field] = json_decode(json_encode($val), true);
                }
            } else {
                if (is_array($val) || is_object($val)) {
                    $data[$field] = json_encode($val, JSON_UNESCAPED_UNICODE);
                }
            }
        }

        return $data;
    }

    public function index(Request $request)
    {
        try {
            $with = ['customFieldValues.field'];
            if (Schema::hasColumn((new Property)->getTable(), 'created_by_id')) {
                $with[] = 'creator';
            }
            return Property::with($with)->latest()->paginate(10);
        } catch (\Throwable $e) {
            Log::error('PropertyController::index ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            $payload = [
                'message' => 'Error loading properties',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ];
            return response()->json($payload, 500);
        }
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $entity = Entity::where('key', 'properties')->first();

        try {
            DB::beginTransaction();

            $data = $request->all();

            foreach ($data as $k => $v) {
                if ($v === '') {
                    $data[$k] = null;
                }
                if (is_string($v) && in_array(trim($v), ['?', '؟'])) {
                    $data[$k] = null;
                }
            }

            if (array_key_exists('installment_plans', $data) && is_string($data['installment_plans'])) {
                $decodedPlans = json_decode($data['installment_plans'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decodedPlans)) {
                    $data['installment_plans'] = $decodedPlans;
                }
            }

            if (array_key_exists('installment_plans', $data) && is_string($data['installment_plans'])) {
                $decodedPlans = json_decode($data['installment_plans'], true);
                if (json_last_error() === JSON_ERROR_NONE && is_array($decodedPlans)) {
                    $data['installment_plans'] = $decodedPlans;
                }
            }

            if ($request->has('title')) $data['name'] = $request->input('title');
            if ($request->has('adTitle')) $data['ad_title'] = $request->input('adTitle');
            if ($request->has('adTitleAr')) $data['ad_title_ar'] = $request->input('adTitleAr');
            if ($request->has('propertyType')) $data['property_type'] = $request->input('propertyType');
            if ($request->has('unitNumber')) $data['unit_number'] = $request->input('unitNumber');
            if ($request->has('bua')) $data['bua'] = $request->input('bua');
            if ($request->has('unitCode')) $data['unit_code'] = $request->input('unitCode');
            if ($request->has('view')) $data['view'] = $request->input('view');
            if ($request->has('internalArea')) $data['internal_area'] = $request->input('internalArea');
            if ($request->has('externalArea')) $data['external_area'] = $request->input('externalArea');
            if ($request->has('totalArea')) $data['total_area'] = $request->input('totalArea');
            if ($request->has('ownerName')) $data['owner_name'] = $request->input('ownerName');
            if ($request->has('ownerMobile')) $data['owner_mobile'] = $request->input('ownerMobile');
            if ($request->has('rentCost')) $data['rent_cost'] = $request->input('rentCost');
            if ($request->has('internalMeterPrice')) $data['internal_meter_price'] = $request->input('internalMeterPrice');
            if ($request->has('externalMeterPrice')) $data['external_meter_price'] = $request->input('externalMeterPrice');
            if ($request->has('meterPrice')) $data['meter_price'] = $request->input('meterPrice');
            if ($request->has('descriptionAr')) $data['description_ar'] = $request->input('descriptionAr');

            if ($request->has('totalPrice')) {
                $data['price'] = str_replace(',', '', (string) $request->input('totalPrice'));
            }

            $data['created_by_id'] = Auth::id();
            $tenantId = Auth::user()->tenant_id ?? null;
            $dir = $tenantId ? ('properties/'.$tenantId) : 'properties';
            $mainExisting = $request->input('main_image_existing');
            if ($request->hasFile('main_image')) {
                $p = $request->file('main_image')->store($dir.'/main', 'public');
                $data['main_image'] = $p;
            } elseif ($mainExisting) {
                $data['main_image'] = $mainExisting;
            }
            $imgs = [];
            $imgsExisting = $request->input('images_existing', []);
            if (!is_array($imgsExisting)) $imgsExisting = $imgsExisting ? [$imgsExisting] : [];
            $imagesFiles = $request->file('images') ?? $request->file('images[]');
            if ($imagesFiles) {
                $imagesFiles = is_array($imagesFiles) ? $imagesFiles : [$imagesFiles];
                foreach ($imagesFiles as $f) {
                    if (!$f) continue;
                    $p = $f->store($dir.'/images', 'public');
                    $imgs[] = $p;
                }
            }
            if (!empty($imgsExisting) || !empty($imgs)) {
                $data['images'] = array_values(array_filter(array_merge($imgsExisting, $imgs)));
            }
            $flps = [];
            $flpsExisting = $request->input('floor_plans_existing', []);
            if (!is_array($flpsExisting)) $flpsExisting = $flpsExisting ? [$flpsExisting] : [];
            $floorPlanFiles = $request->file('floor_plans') ?? $request->file('floor_plans[]');
            if ($floorPlanFiles) {
                $floorPlanFiles = is_array($floorPlanFiles) ? $floorPlanFiles : [$floorPlanFiles];
                foreach ($floorPlanFiles as $f) {
                    if (!$f) continue;
                    $p = $f->store($dir.'/floor-plans', 'public');
                    $flps[] = $p;
                }
            }
            if (!empty($flpsExisting) || !empty($flps)) {
                $data['floor_plans'] = array_values(array_filter(array_merge($flpsExisting, $flps)));
            }
            $docs = [];
            $docsExisting = $request->input('documents_existing', []);
            if (!is_array($docsExisting)) $docsExisting = $docsExisting ? [$docsExisting] : [];
            $documentFiles = $request->file('documents') ?? $request->file('documents[]');
            if ($documentFiles) {
                $documentFiles = is_array($documentFiles) ? $documentFiles : [$documentFiles];
                foreach ($documentFiles as $f) {
                    if (!$f) continue;
                    $p = $f->store($dir.'/documents', 'public');
                    $docs[] = $p;
                }
            }
            if (!empty($docsExisting) || !empty($docs)) {
                $data['documents'] = array_values(array_filter(array_merge($docsExisting, $docs)));
            }
            $cil = [];
            $cilExisting = $request->input('cil_attachments_existing', []);
            if (!is_array($cilExisting)) $cilExisting = $cilExisting ? [$cilExisting] : [];
            $cilFiles = $request->file('cil_attachments') ?? $request->file('cil_attachments[]');
            if ($cilFiles) {
                $cilFiles = is_array($cilFiles) ? $cilFiles : [$cilFiles];
                foreach ($cilFiles as $f) {
                    if (!$f) continue;
                    $p = $f->store($dir.'/cil', 'public');
                    $cil[] = $p;
                }
            }
            if (!empty($cilExisting) || !empty($cil)) {
                $data['cil_attachments'] = array_values(array_filter(array_merge($cilExisting, $cil)));
            }

            $decimalKeys = [
                'bua','internal_area','external_area','total_area','rent_cost',
                'internal_meter_price','external_meter_price','meter_price',
                'discount','reservation_amount','garage_amount','maintenance_amount',
                'net_amount','total_after_discount','meter_price'
            ];
            foreach ($decimalKeys as $k) {
                if (array_key_exists($k, $data) && $data[$k] !== null) {
                    $val = is_string($data[$k]) ? preg_replace('/[^\d\.\-]/', '', $data[$k]) : $data[$k];
                    $data[$k] = ($val === '' ? null : (float) $val);
                }
            }
            $integerKeys = ['bedrooms','bathrooms','rooms','floor'];
            foreach ($integerKeys as $k) {
                if (array_key_exists($k, $data) && $data[$k] !== null) {
                    $val = is_string($data[$k]) ? preg_replace('/\D/', '', $data[$k]) : $data[$k];
                    $data[$k] = ($val === '' ? null : (int) $val);
                }
            }

            if (array_key_exists('elevator', $data) && $data['elevator'] !== null) {
                $v = $data['elevator'];
                if (is_string($v)) {
                    $vl = strtolower($v);
                    if (in_array($vl, ['1', 'true', 'yes', 'on'], true)) {
                        $data['elevator'] = 1;
                    } elseif (in_array($vl, ['0', 'false', 'no', 'off'], true)) {
                        $data['elevator'] = 0;
                    } else {
                        $data['elevator'] = (int) preg_replace('/\D/', '', $v);
                    }
                } else {
                    $data['elevator'] = $v ? 1 : 0;
                }
            }

            $columns = Schema::getColumnListing((new Property)->getTable());
            $data = array_intersect_key($data, array_flip($columns));

            $data = $this->normalizeJsonPayload($data);

            if (empty($data['tenant_id']) && Auth::check() && Auth::user()->tenant_id) {
                $data['tenant_id'] = Auth::user()->tenant_id;
            }

            $crmSetting = CrmSetting::first();
            $settings = ($crmSetting && is_array($crmSetting->settings ?? null)) ? $crmSetting->settings : [];
            $autoGenerateUnitCode = array_key_exists('unitCodeGeneration', $settings)
                ? (bool) $settings['unitCodeGeneration']
                : true;

            if (empty($data['unit_code']) && $autoGenerateUnitCode) {
                $prefix = $settings['unitCodePrefix'] ?? 'U-';
                $maxId = (Property::max('id') ?? 1);
                $data['unit_code'] = $prefix . str_pad((string) $maxId, 5, '0', STR_PAD_LEFT);
            }

            $checkDup = (bool) ($settings['duplicationSystem'] ?? false);
            $allowDup = (bool) ($settings['allowDuplicateProperties'] ?? false);
            if ($checkDup && !$allowDup) {
                if (!empty($data['unit_code']) && Property::where('unit_code', $data['unit_code'])->exists()) {
                    return response()->json(['message' => 'Duplicate unit code'], 422);
                }
            }

            $property = Property::create($data);

            if ($request->has('custom_fields') && $entity) {
                $fieldIds = $entity->fields->pluck('id', 'key');
                foreach ($request->input('custom_fields') as $key => $value) {
                    if (isset($fieldIds[$key])) {
                        FieldValue::create([
                            'field_id' => $fieldIds[$key],
                            'record_id' => $property->id,
                            'value' => $value,
                        ]);
                    }
                }
            }

            DB::commit();
            $with = ['customFieldValues.field'];
            if (Schema::hasColumn((new Property)->getTable(), 'created_by_id')) {
                $with[] = 'creator';
            }
            return response()->json($property->load($with), 201);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('PropertyController::store', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $with = ['customFieldValues.field'];
        if (Schema::hasColumn((new Property)->getTable(), 'created_by_id')) {
            $with[] = 'creator';
        }
        return Property::with($with)->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $property = Property::findOrFail($id);

        try {
            $data = $request->all();

            foreach ($data as $k => $v) {
                if ($v === '') {
                    $data[$k] = null;
                }
                if (is_string($v) && in_array(trim($v), ['?', '؟'])) {
                    $data[$k] = null;
                }
            }

            if ($request->has('title')) $data['name'] = $request->input('title');
            if ($request->has('adTitle')) $data['ad_title'] = $request->input('adTitle');
            if ($request->has('adTitleAr')) $data['ad_title_ar'] = $request->input('adTitleAr');
            if ($request->has('propertyType')) $data['property_type'] = $request->input('propertyType');
            if ($request->has('unitNumber')) $data['unit_number'] = $request->input('unitNumber');
            if ($request->has('bua')) $data['bua'] = $request->input('bua');
            if ($request->has('unitCode')) $data['unit_code'] = $request->input('unitCode');
            if ($request->has('view')) $data['view'] = $request->input('view');
            if ($request->has('internalArea')) $data['internal_area'] = $request->input('internalArea');
            if ($request->has('externalArea')) $data['external_area'] = $request->input('externalArea');
            if ($request->has('totalArea')) $data['total_area'] = $request->input('totalArea');
            if ($request->has('ownerName')) $data['owner_name'] = $request->input('ownerName');
            if ($request->has('ownerMobile')) $data['owner_mobile'] = $request->input('ownerMobile');
            if ($request->has('rentCost')) $data['rent_cost'] = $request->input('rentCost');
            if ($request->has('internalMeterPrice')) $data['internal_meter_price'] = $request->input('internalMeterPrice');
            if ($request->has('externalMeterPrice')) $data['external_meter_price'] = $request->input('externalMeterPrice');
            if ($request->has('meterPrice')) $data['meter_price'] = $request->input('meterPrice');
            if ($request->has('descriptionAr')) $data['description_ar'] = $request->input('descriptionAr');

            if ($request->has('totalPrice')) {
                $data['price'] = str_replace(',', '', (string) $request->input('totalPrice'));
            }

            $decimalKeys = [
                'bua','internal_area','external_area','total_area','rent_cost',
                'internal_meter_price','external_meter_price','meter_price',
                'discount','reservation_amount','garage_amount','maintenance_amount',
                'net_amount','total_after_discount','meter_price'
            ];
            foreach ($decimalKeys as $k) {
                if (array_key_exists($k, $data) && $data[$k] !== null) {
                    $val = is_string($data[$k]) ? preg_replace('/[^\d\.\-]/', '', $data[$k]) : $data[$k];
                    $data[$k] = ($val === '' ? null : (float) $val);
                }
            }
            $integerKeys = ['bedrooms','bathrooms','rooms','floor'];
            foreach ($integerKeys as $k) {
                if (array_key_exists($k, $data) && $data[$k] !== null) {
                    $val = is_string($data[$k]) ? preg_replace('/\D/', '', $data[$k]) : $data[$k];
                    $data[$k] = ($val === '' ? null : (int) $val);
                }
            }

            if (array_key_exists('elevator', $data) && $data['elevator'] !== null) {
                $v = $data['elevator'];
                if (is_string($v)) {
                    $vl = strtolower($v);
                    if (in_array($vl, ['1', 'true', 'yes', 'on'], true)) {
                        $data['elevator'] = 1;
                    } elseif (in_array($vl, ['0', 'false', 'no', 'off'], true)) {
                        $data['elevator'] = 0;
                    } else {
                        $data['elevator'] = (int) preg_replace('/\D/', '', $v);
                    }
                } else {
                    $data['elevator'] = $v ? 1 : 0;
                }
            }

            $tenantId = Auth::user()->tenant_id ?? null;
            $dir = $tenantId ? ('properties/'.$tenantId) : 'properties';
            $mainExisting = $request->input('main_image_existing');
            if ($request->hasFile('main_image')) {
                $p = $request->file('main_image')->store($dir.'/main', 'public');
                $data['main_image'] = $p;
            } elseif ($mainExisting) {
                $data['main_image'] = $mainExisting;
            }
            $imgs = [];
            $imgsExisting = $request->input('images_existing', []);
            if (!is_array($imgsExisting)) $imgsExisting = $imgsExisting ? [$imgsExisting] : [];
            $imagesFiles = $request->file('images') ?? $request->file('images[]');
            if ($imagesFiles) {
                $imagesFiles = is_array($imagesFiles) ? $imagesFiles : [$imagesFiles];
                foreach ($imagesFiles as $f) {
                    if (!$f) continue;
                    $p = $f->store($dir.'/images', 'public');
                    $imgs[] = $p;
                }
            }
            if (isset($data['images']) && is_array($data['images'])) $imgsExisting = array_merge($imgsExisting, $data['images']);
            if (!empty($imgsExisting) || !empty($imgs)) {
                $data['images'] = array_values(array_filter(array_merge($imgsExisting, $imgs)));
            }
            $flps = [];
            $flpsExisting = $request->input('floor_plans_existing', []);
            if (!is_array($flpsExisting)) $flpsExisting = $flpsExisting ? [$flpsExisting] : [];
            $floorPlanFiles = $request->file('floor_plans') ?? $request->file('floor_plans[]');
            if ($floorPlanFiles) {
                $floorPlanFiles = is_array($floorPlanFiles) ? $floorPlanFiles : [$floorPlanFiles];
                foreach ($floorPlanFiles as $f) {
                    if (!$f) continue;
                    $p = $f->store($dir.'/floor-plans', 'public');
                    $flps[] = $p;
                }
            }
            if (isset($data['floor_plans']) && is_array($data['floor_plans'])) $flpsExisting = array_merge($flpsExisting, $data['floor_plans']);
            if (!empty($flpsExisting) || !empty($flps)) {
                $data['floor_plans'] = array_values(array_filter(array_merge($flpsExisting, $flps)));
            }
            $docs = [];
            $docsExisting = $request->input('documents_existing', []);
            if (!is_array($docsExisting)) $docsExisting = $docsExisting ? [$docsExisting] : [];
            $documentFiles = $request->file('documents') ?? $request->file('documents[]');
            if ($documentFiles) {
                $documentFiles = is_array($documentFiles) ? $documentFiles : [$documentFiles];
                foreach ($documentFiles as $f) {
                    if (!$f) continue;
                    $p = $f->store($dir.'/documents', 'public');
                    $docs[] = $p;
                }
            }
            if (isset($data['documents']) && is_array($data['documents'])) $docsExisting = array_merge($docsExisting, $data['documents']);
            if (!empty($docsExisting) || !empty($docs)) {
                $data['documents'] = array_values(array_filter(array_merge($docsExisting, $docs)));
            }
            $cil = [];
            $cilExisting = $request->input('cil_attachments_existing', []);
            if (!is_array($cilExisting)) $cilExisting = $cilExisting ? [$cilExisting] : [];
            $cilFiles = $request->file('cil_attachments') ?? $request->file('cil_attachments[]');
            if ($cilFiles) {
                $cilFiles = is_array($cilFiles) ? $cilFiles : [$cilFiles];
                foreach ($cilFiles as $f) {
                    if (!$f) continue;
                    $p = $f->store($dir.'/cil', 'public');
                    $cil[] = $p;
                }
            }
            if (isset($data['cil_attachments']) && is_array($data['cil_attachments'])) $cilExisting = array_merge($cilExisting, $data['cil_attachments']);
            if (!empty($cilExisting) || !empty($cil)) {
                $data['cil_attachments'] = array_values(array_filter(array_merge($cilExisting, $cil)));
            }

            // Inventory status side-effects
            if (array_key_exists('status', $data) && $data['status'] !== null) {
                $nextStatus = strtolower(trim((string) $data['status']));
                $curStatus = strtolower(trim((string) ($property->status ?? '')));

                // Sensitive action: reverting a Sold unit back to Available.
                if ($curStatus === 'sold' && $nextStatus === 'available') {
                    $actor = Auth::user();
                    $roleRaw = (string) ($actor->role ?? $actor->job_title ?? '');
                    $roleLower = strtolower(trim($roleRaw));
                    $isAdmin = ($actor && ($actor->is_super_admin ?? false)) || in_array($roleLower, ['admin', 'tenant admin', 'tenant-admin'], true);

                    $meta = [];
                    try {
                        if (is_array($actor?->meta_data)) {
                            $meta = $actor->meta_data;
                        } elseif (is_string($actor?->meta_data)) {
                            $decoded = json_decode($actor->meta_data, true);
                            $meta = is_array($decoded) ? $decoded : [];
                        }
                    } catch (\Throwable $e) {
                    }

                    $modulePerms = is_array($meta['module_permissions'] ?? null) ? ($meta['module_permissions'] ?? []) : [];
                    $inventoryPerms = $modulePerms['Inventory'] ?? [];
                    $inventoryPerms = is_array($inventoryPerms) ? $inventoryPerms : [];
                    $canRevert = $isAdmin || in_array('revertSoldProperty', $inventoryPerms, true);

                    if (!$canRevert) {
                        return response()->json(['message' => 'You do not have permission to revert sold units'], 403);
                    }

                    $reason = trim((string) $request->input('revert_reason', ''));
                    try {
                        activity('inventory')
                            ->performedOn($property)
                            ->causedBy($actor)
                            ->withProperties([
                                'from' => $property->status,
                                'to' => $data['status'],
                                'reason' => $reason,
                                'property_id' => $property->id,
                            ])
                            ->log('revert_sold_to_available');
                    } catch (\Throwable $e) {
                    }
                }

                $hasReservedAt = Schema::hasColumn((new Property)->getTable(), 'reserved_at');
                $hasReservedExpiresAt = Schema::hasColumn((new Property)->getTable(), 'reserved_expires_at');
                $hasReservedLeadId = Schema::hasColumn((new Property)->getTable(), 'reserved_lead_id');
                $hasSoldAt = Schema::hasColumn((new Property)->getTable(), 'sold_at');
                $hasSoldLeadId = Schema::hasColumn((new Property)->getTable(), 'sold_lead_id');

                if ($nextStatus === 'available') {
                    if ($hasReservedAt) $data['reserved_at'] = null;
                    if ($hasReservedExpiresAt) $data['reserved_expires_at'] = null;
                    if ($hasReservedLeadId) $data['reserved_lead_id'] = null;
                    if ($hasSoldAt) $data['sold_at'] = null;
                    if ($hasSoldLeadId) $data['sold_lead_id'] = null;
                } elseif ($nextStatus === 'sold') {
                    if ($hasSoldAt && empty($property->sold_at)) $data['sold_at'] = now();
                    if ($hasReservedAt) $data['reserved_at'] = null;
                    if ($hasReservedExpiresAt) $data['reserved_expires_at'] = null;
                    if ($hasReservedLeadId) $data['reserved_lead_id'] = null;
                } elseif ($nextStatus === 'reserved') {
                    if ($hasReservedAt && empty($property->reserved_at)) $data['reserved_at'] = now();
                    if ($hasSoldAt) $data['sold_at'] = null;
                    if ($hasSoldLeadId) $data['sold_lead_id'] = null;
                }
            }

            $columns = Schema::getColumnListing((new Property)->getTable());
            $data = array_intersect_key($data, array_flip($columns));

            $data = $this->normalizeJsonPayload($data);

            $property->update($data);

            $entity = Entity::where('key', 'properties')->first();
            if ($request->has('custom_fields') && $entity) {
                $fieldIds = $entity->fields->pluck('id', 'key');
                foreach ($request->input('custom_fields') as $key => $value) {
                    if (isset($fieldIds[$key])) {
                        FieldValue::updateOrCreate(
                            ['field_id' => $fieldIds[$key], 'record_id' => $property->id],
                            ['value' => $value]
                        );
                    }
                }
            }

            $with = ['customFieldValues.field'];
            if (Schema::hasColumn((new Property)->getTable(), 'created_by_id')) {
                $with[] = 'creator';
            }
            return response()->json($property->load($with));
        } catch (Exception $e) {
            Log::error('PropertyController::update', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        if ($resp = $this->authorizeInventoryDelete($request, 'realestate')) {
            return $resp;
        }
        Property::findOrFail($id)->delete();
        return response()->json(['message' => 'Property deleted']);
    }
}
