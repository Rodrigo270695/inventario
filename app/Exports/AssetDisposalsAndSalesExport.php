<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class AssetDisposalsAndSalesExport implements WithMultipleSheets
{
    public function __construct(
        private Collection $disposals,
        private Collection $sales
    ) {}

    public function sheets(): array
    {
        return [
            new AssetDisposalsSheetExport($this->disposals),
            new AssetSalesSheetExport($this->sales),
        ];
    }
}

