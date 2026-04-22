<?php

namespace App\Services;

use App\Models\BackupLog;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

class BackupRunner
{
    public function runFullBackup(BackupLog $log): void
    {
        $connection = (string) config('database.default');
        $config = (array) config("database.connections.{$connection}");

        $timestamp = now()->format('Ymd_His_u');
        $dir = storage_path('app/backups/database/'.now()->format('Y/m'));
        File::ensureDirectoryExists($dir);

        try {
            if ($connection === 'pgsql') {
                $file = "backup_{$timestamp}.sql";
                $absolutePath = $dir.DIRECTORY_SEPARATOR.$file;
                $this->runPgDump($config, $absolutePath);
                $this->markCompleted($log, 'backups/database/'.now()->format('Y/m')."/{$file}");

                return;
            }

            if ($connection === 'mysql') {
                $file = "backup_{$timestamp}.sql";
                $absolutePath = $dir.DIRECTORY_SEPARATOR.$file;
                $this->runMysqlDump($config, $absolutePath);
                $this->markCompleted($log, 'backups/database/'.now()->format('Y/m')."/{$file}");

                return;
            }

            if ($connection === 'sqlite') {
                $source = (string) ($config['database'] ?? '');
                if ($source === '' || ! File::exists($source)) {
                    throw new \RuntimeException('No se encontró el archivo SQLite de origen.');
                }

                $file = "backup_{$timestamp}.sqlite";
                $absolutePath = $dir.DIRECTORY_SEPARATOR.$file;
                File::copy($source, $absolutePath);
                $this->markCompleted($log, 'backups/database/'.now()->format('Y/m')."/{$file}");

                return;
            }

            throw new \RuntimeException("Motor de BD no soportado para backup automático: {$connection}");
        } catch (\Throwable $e) {
            $this->markFailed($log, $e->getMessage());
        }
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function runPgDump(array $config, string $absolutePath): void
    {
        $binary = $this->resolvePgDumpBinary();
        $host = (string) ($config['host'] ?? '127.0.0.1');
        $port = (string) ($config['port'] ?? '5432');
        $username = (string) ($config['username'] ?? '');
        $database = (string) ($config['database'] ?? '');
        $filePath = str_replace('\\', '/', $absolutePath);
        $password = (string) ($config['password'] ?? '');
        $restrictKeys = array_values(array_unique([
            $this->resolveRestrictKey(),
            'inventario2026',
            'inv2026',
        ]));
        $dsn = sprintf(
            'postgresql://%s:%s@%s:%s/%s',
            rawurlencode($username),
            rawurlencode($password),
            rawurlencode($host),
            rawurlencode($port),
            rawurlencode($database)
        );

        $lastCommand = [];
        $process = null;
        foreach ($restrictKeys as $restrictKey) {
            $command = [
                $binary,
                '--host='.$host,
                '--port='.$port,
                '--username='.$username,
                '--format=plain',
                '--no-owner',
                '--no-privileges',
                '--restrict-key='.$restrictKey,
                '--file='.$filePath,
                '--dbname='.$dsn,
            ];
            $lastCommand = $command;
            $process = $this->executeProcess($command, 3);
            if ($process->isSuccessful()) {
                return;
            }

            // Intento alternativo con nombre de BD (sin connstring), manteniendo PGPASSWORD.
            $classic = [
                $binary,
                '--host='.$host,
                '--port='.$port,
                '--username='.$username,
                '--format=plain',
                '--no-owner',
                '--no-privileges',
                '--restrict-key='.$restrictKey,
                '--file='.$filePath,
                $database,
            ];
            $lastCommand = $classic;
            $process = $this->executeProcess($classic, 3, ['PGPASSWORD' => $password]);
            if ($process->isSuccessful()) {
                return;
            }
        }

        if ($process instanceof Process && ! $process->isSuccessful()) {
            $this->logProcessFailure('pg_dump', $lastCommand, $process);
            $detail = trim($process->getErrorOutput().' '.$process->getOutput());
            throw new \RuntimeException($detail !== '' ? $detail : 'pg_dump falló sin detalle.');
        }
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function runMysqlDump(array $config, string $absolutePath): void
    {
        $binary = $this->resolveMysqlDumpBinary();

        $command = [
            $binary,
            '--host='.(string) ($config['host'] ?? '127.0.0.1'),
            '--port='.(string) ($config['port'] ?? '3306'),
            '--user='.(string) ($config['username'] ?? ''),
            '--result-file='.$absolutePath,
            (string) ($config['database'] ?? ''),
        ];
        if ((string) ($config['password'] ?? '') !== '') {
            $command[] = '--password='.(string) $config['password'];
        }

        $process = new Process($command, base_path(), $this->processEnv(), null, 300);
        $process->run();

        if (! $process->isSuccessful()) {
            $this->logProcessFailure('mysqldump', $command, $process);
            $detail = trim($process->getErrorOutput().' '.$process->getOutput());
            throw new \RuntimeException($detail !== '' ? $detail : 'mysqldump falló sin detalle.');
        }
    }

    private function markCompleted(BackupLog $log, string $path): void
    {
        $log->forceFill([
            'status' => 'completed',
            'completed_at' => now(),
            'path_or_ref' => $path,
        ])->save();
    }

    private function markFailed(BackupLog $log, string $message): void
    {
        $normalized = $this->normalizeErrorMessage($message);
        $log->forceFill([
            'status' => 'failed',
            'completed_at' => now(),
            'path_or_ref' => 'ERROR: '.substr($normalized, 0, 1000),
        ])->save();
    }

    private function resolvePgDumpBinary(): string
    {
        $configured = trim((string) env('PG_DUMP_BINARY', ''));
        if ($configured !== '') {
            return $configured;
        }

        if (! $this->isWindows()) {
            return 'pg_dump';
        }

        $candidates = [];
        $programFiles = [];
        foreach (['ProgramFiles', 'ProgramFiles(x86)'] as $envKey) {
            $base = getenv($envKey);
            if (is_string($base) && $base !== '' && is_dir($base)) {
                $programFiles[] = $base;
            }
        }

        foreach ($programFiles as $base) {
            foreach (glob($base.'\\PostgreSQL\\*\\bin\\pg_dump.exe') ?: [] as $path) {
                $candidates[] = $path;
            }
        }

        if ($candidates !== []) {
            usort($candidates, static fn ($a, $b) => strnatcasecmp((string) $b, (string) $a));

            return (string) $candidates[0];
        }

        throw new \RuntimeException(
            'No se encontró pg_dump. Defina PG_DUMP_BINARY en .env o agregue pg_dump al PATH.'
        );
    }

    private function resolveMysqlDumpBinary(): string
    {
        $configured = trim((string) env('MYSQL_DUMP_BINARY', ''));
        if ($configured !== '') {
            return $configured;
        }

        if (! $this->isWindows()) {
            return 'mysqldump';
        }

        $candidates = [];
        $programFiles = [];
        foreach (['ProgramFiles', 'ProgramFiles(x86)'] as $envKey) {
            $base = getenv($envKey);
            if (is_string($base) && $base !== '' && is_dir($base)) {
                $programFiles[] = $base;
            }
        }

        foreach ($programFiles as $base) {
            foreach (glob($base.'\\MySQL\\MySQL Server *\\bin\\mysqldump.exe') ?: [] as $path) {
                $candidates[] = $path;
            }
            foreach (glob($base.'\\MariaDB *\\bin\\mysqldump.exe') ?: [] as $path) {
                $candidates[] = $path;
            }
        }

        if ($candidates !== []) {
            usort($candidates, static fn ($a, $b) => strnatcasecmp((string) $b, (string) $a));

            return (string) $candidates[0];
        }

        throw new \RuntimeException(
            'No se encontró mysqldump. Defina MYSQL_DUMP_BINARY en .env o agregue mysqldump al PATH.'
        );
    }

    private function isWindows(): bool
    {
        return DIRECTORY_SEPARATOR === '\\';
    }

    private function resolveRestrictKey(): string
    {
        $raw = trim((string) env('PG_DUMP_RESTRICT_KEY', 'inventario2026'));
        $normalized = preg_replace('/[^a-zA-Z0-9]/', '', $raw);
        if (! is_string($normalized) || $normalized === '') {
            $normalized = 'inv'.Str::lower(Str::random(8));
            $normalized = preg_replace('/[^a-zA-Z0-9]/', '', $normalized) ?: 'inventario2026';
        }

        return $normalized;
    }

    /**
     * @param  array<string, string>  $overrides
     * @return array<string, string>
     */
    private function processEnv(array $overrides = []): array
    {
        $env = [];
        foreach (array_merge($_SERVER, $_ENV) as $key => $value) {
            if (! is_string($key)) {
                continue;
            }
            if (is_scalar($value) || $value === null) {
                $env[$key] = (string) $value;
            }
        }
        foreach ($overrides as $key => $value) {
            $env[$key] = $value;
        }

        return $env;
    }

    private function normalizeErrorMessage(string $message): string
    {
        $message = str_replace(["\r\n", "\r"], "\n", $message);
        $message = trim($message);
        if ($message === '') {
            return 'Sin detalle de error.';
        }

        // En Windows algunas herramientas nativas devuelven salida en CP1252/ANSI.
        if (! mb_check_encoding($message, 'UTF-8')) {
            $converted = @mb_convert_encoding($message, 'UTF-8', 'Windows-1252');
            if (is_string($converted) && $converted !== '') {
                $message = $converted;
            }
        }

        return $message;
    }

    /**
     * @param  array<int, string>|string  $command
     */
    private function logProcessFailure(string $tool, array|string $command, Process $process): void
    {
        try {
            $errorOutput = $process->getErrorOutput();
            Log::error('backup process failed', [
                'tool' => $tool,
                'command' => $command,
                'exit_code' => $process->getExitCode(),
                'error_output' => $errorOutput,
                'error_output_len' => strlen($errorOutput),
                'error_output_b64' => base64_encode($errorOutput),
                'std_output' => $process->getOutput(),
                'php_sapi' => PHP_SAPI,
                'php_binary' => PHP_BINARY,
                'cwd' => base_path(),
                'binary_exists' => isset($command[0]) ? File::exists((string) $command[0]) : null,
                'binary_is_executable' => isset($command[0]) ? is_executable((string) $command[0]) : null,
                'system_root' => getenv('SystemRoot') ?: null,
                'path_sample' => mb_substr((string) (getenv('PATH') ?: ''), 0, 300),
            ]);
        } catch (\Throwable) {
            // Evita romper el flujo principal por un fallo de logging.
        }
    }

    private function isGenericPgDumpFailure(Process $process): bool
    {
        $error = trim((string) $process->getErrorOutput());
        $output = trim((string) $process->getOutput());
        if ($error === '' && $output === '') {
            return true;
        }

        return $error === 'pg_dump: error:' || $output === 'pg_dump: error:';
    }

    private function isRestrictError(Process $process): bool
    {
        $combined = mb_strtolower($process->getErrorOutput().' '.$process->getOutput());

        return str_contains($combined, 'restrict');
    }

    /**
     * @param  array<int, string>  $command
     * @param  array<string, string>  $overrides
     */
    private function executeProcess(array $command, int $maxAttempts = 2, array $overrides = []): Process
    {
        $attempts = max(1, $maxAttempts);
        $process = new Process($command, base_path(), $this->processEnv($overrides), null, 300);
        for ($i = 1; $i <= $attempts; $i++) {
            $process->run();
            if ($process->isSuccessful()) {
                return $process;
            }
            if (! $this->isGenericPgDumpFailure($process) && ! $this->isRestrictError($process)) {
                return $process;
            }
            if ($i < $attempts) {
                usleep(250000 * $i);
            }
        }

        return $process;
    }

}
