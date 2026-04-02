<?php

namespace App\Services\Imports\Contracts;

use App\Models\ImportJob;

interface ImportHandler
{
    /**
     * Process a batch of rows for a given job.
     *
     * @param array<int, array<string, mixed>> $rows
     * @param array<string, string> $mapping
     * @param array<string, mixed> $options
     */
    public function handle(ImportJob $job, array $rows, array $mapping, array $options = []): void;
}

