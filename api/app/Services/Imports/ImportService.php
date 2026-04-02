<?php

namespace App\Services\Imports;

use App\Models\ImportJob;
use App\Services\Imports\Contracts\ImportHandler;
use App\Services\Imports\Handlers\LeadsImportHandler;
use Illuminate\Support\Str;

class ImportService
{
    public function handlerFor(string $module): ImportHandler
    {
        $module = Str::of($module)->lower()->trim()->toString();

        return match ($module) {
            'leads', 'lead' => app(LeadsImportHandler::class),
            default => throw new \InvalidArgumentException("Unsupported import module: {$module}"),
        };
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @param array<string, string> $mapping
     * @param array<string, mixed> $options
     */
    public function run(ImportJob $job, string $module, array $rows, array $mapping, array $options = []): void
    {
        $handler = $this->handlerFor($module);
        $handler->handle($job, $rows, $mapping, $options);
    }
}

