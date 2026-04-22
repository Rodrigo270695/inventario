<?php

use App\Http\Controllers\Api\Agent\AgentReportController;
use App\Http\Middleware\AuthenticateAgentToken;
use Illuminate\Support\Facades\Route;

Route::middleware([
    'throttle:120,1',
    AuthenticateAgentToken::class,
])->group(function (): void {
    Route::post('reports', [AgentReportController::class, 'store'])->name('reports.store');
});
