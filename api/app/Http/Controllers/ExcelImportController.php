<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Lead;
use App\Models\Export;

class ExcelImportController extends Controller
{
    public function importLeads(Request $request)
    {
        $user = $request->user();

        // Handle JSON import (from generic /api/import)
        if ($request->isJson() || $request->has('rows')) {
            $rows = $request->input('rows', []);
            $module = $request->input('module', 'Leads');
            $mapping = $request->input('mapping', []);
            
            $created = 0;
            $failedRows = 0;

            foreach ($rows as $row) {
                try {
                    // Map generic rows to Lead model based on mapping
                    $data = [];
                    foreach ($mapping as $fileCol => $targetField) {
                        if ($targetField && isset($row[$fileCol])) {
                            $data[$targetField] = $row[$fileCol];
                        }
                    }

                    if (empty($data)) continue;

                    Lead::create(array_merge([
                        'tenant_id' => $user->tenant_id,
                        'source' => 'import',
                        'status' => 'new',
                        'priority' => 'medium',
                    ], $data));
                    
                    $created++;
                } catch (\Throwable $e) {
                    $failedRows++;
                }
            }

            Export::create([
                'tenant_id' => $user->tenant_id,
                'user_id' => $user->id,
                'module' => ucfirst($module),
                'action' => 'import',
                'file_name' => 'JSON_Import_' . now()->format('Y-m-d_H-i-s'),
                'status' => $created > 0 ? 'success' : 'failed',
                'meta_data' => ['created' => $created, 'failed' => $failedRows]
            ]);

            return response()->json([
                'message' => 'Imported successfully',
                'success' => $created,
                'failed' => $failedRows,
                'total' => count($rows)
            ], 200);
        }

        // Handle File upload import (from /api/imports/leads/excel)
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx|max:5120',
        ]);

        if ($validator->fails()) {
            try {
                $file = $request->file('file');
                $fileName = $file ? $file->getClientOriginalName() : 'unknown_file';
                Export::create([
                    'tenant_id' => $user->tenant_id,
                    'user_id' => $user->id,
                    'module' => 'Leads',
                    'action' => 'import',
                    'file_name' => $fileName,
                    'status' => 'failed',
                    'error_message' => json_encode($validator->errors()->toArray()),
                ]);
            } catch (\Throwable $e) {
            }
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();

        try {
            if (!class_exists(\PhpOffice\PhpSpreadsheet\IOFactory::class)) {
                Export::create([
                    'tenant_id' => $user->tenant_id,
                    'user_id' => $user->id,
                    'module' => 'Leads',
                    'action' => 'import',
                    'file_name' => $fileName,
                    'status' => 'failed',
                    'error_message' => 'Excel processing library missing'
                ]);
                return response()->json([
                    'error' => 'library_missing',
                    'message' => 'Excel processing library not installed or PHP zip extension is missing'
                ], 501);
            }
            $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();

            $rows = [];
            foreach ($sheet->toArray(null, true, true, true) as $rowIndex => $row) {
                if ($rowIndex === 1) {
                    $headers = array_map(fn($h) => strtolower(trim((string) $h)), $row);
                    continue;
                }
                if (!isset($headers)) {
                    Export::create([
                        'tenant_id' => $user->tenant_id,
                        'user_id' => $user->id,
                        'module' => 'Leads',
                        'action' => 'import',
                        'file_name' => $fileName,
                        'status' => 'failed',
                        'error_message' => 'Invalid sheet: missing header row'
                    ]);
                    return response()->json(['message' => 'Invalid sheet: missing header row'], 400);
                }
                $data = [];
                $colIndex = 0;
                foreach ($row as $col => $value) {
                    $header = $headers[$col] ?? null;
                    if ($header && $header !== '') {
                        $data[$header] = is_string($value) ? trim($value) : $value;
                    }
                    $colIndex++;
                }
                if (!empty(array_filter($data, fn($v) => $v !== null && $v !== ''))) {
                    $rows[] = $data;
                }
            }

            $created = 0;
            $failedRows = 0;
            foreach ($rows as $leadData) {
                try {
                    $src = $leadData['source'] ?? null;
                    if (!$src || strtolower((string)$src) === 'import') {
                        $src = 'cold-call';
                    }
                    $lead = Lead::create([
                        'tenant_id' => $user->tenant_id,
                        'name' => $leadData['name'] ?? 'Unknown',
                        'email' => $leadData['email'] ?? null,
                        'phone' => $leadData['phone'] ?? null,
                        'company' => $leadData['company'] ?? null,
                        'status' => $leadData['status'] ?? 'new',
                        'priority' => $leadData['priority'] ?? 'medium',
                        'source' => $src,
                        'campaign' => $leadData['campaign'] ?? null,
                        'assigned_to' => $leadData['assigned_to'] ?? null,
                        'estimated_value' => $leadData['estimated_value'] ?? 0,
                        'notes' => $leadData['notes'] ?? null,
                    ]);
                    $created++;
                } catch (\Throwable $e) {
                    $failedRows++;
                    continue;
                }
            }

            Export::create([
                'tenant_id' => $user->tenant_id,
                'user_id' => $user->id,
                'module' => 'Leads',
                'action' => 'import',
                'file_name' => $fileName,
                'status' => $created > 0 ? 'success' : 'failed',
                'meta_data' => ['created' => $created, 'failed' => $failedRows],
                'error_message' => $created === 0 ? 'No leads were created' : null
            ]);

            return response()->json(['message' => 'Imported successfully', 'count' => $created], 200);
        } catch (\Throwable $e) {
            Export::create([
                'tenant_id' => $user->tenant_id,
                'user_id' => $user->id,
                'module' => 'Leads',
                'action' => 'import',
                'file_name' => $fileName,
                'status' => 'failed',
                'error_message' => 'Invalid or corrupted .xlsx file: ' . $e->getMessage()
            ]);
            return response()->json(['error' => 'failed_to_parse', 'message' => 'Invalid or corrupted .xlsx file'], 400);
        }
    }
}
