<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    /**
     * Crea proveedores de ejemplo.
     */
    public function run(): void
    {
        $definitions = [
            [
                'name' => 'TECNOLOGÍAS ANDINAS S.A.C.',
                'ruc' => '20123456001',
                'contact_name' => 'Carlos Huamán',
                'contact_email' => 'ventas@tecnoandinas.pe',
                'contact_phone' => '+51 1 700 1000',
                'address' => 'Av. Javier Prado 1234, San Isidro, Lima',
                'payment_conditions' => 'Crédito 30 días',
            ],
            [
                'name' => 'COMPUTO NORTE E.I.R.L.',
                'ruc' => '20456789012',
                'contact_name' => 'María López',
                'contact_email' => 'mlopes@computonorte.pe',
                'contact_phone' => '+51 74 600 200',
                'address' => 'Jr. Comercio 250, Chiclayo',
                'payment_conditions' => 'Contado',
            ],
            [
                'name' => 'SOLUCIONES DIGITALES DEL PERÚ S.A.C.',
                'ruc' => '20600111222',
                'contact_name' => 'Jorge Paredes',
                'contact_email' => 'contacto@soludigital.pe',
                'contact_phone' => '+51 1 710 3030',
                'address' => 'Av. Arequipa 4560, Miraflores, Lima',
                'payment_conditions' => 'Crédito 15 días',
            ],
            [
                'name' => 'IMPORTACIONES TECNO ORIENTE S.R.L.',
                'ruc' => '20543216789',
                'contact_name' => 'Ana Rivas',
                'contact_email' => 'ventas@tecnooriente.pe',
                'contact_phone' => '+51 65 500 800',
                'address' => 'Jr. Arica 320, Tarapoto',
                'payment_conditions' => 'Crédito 45 días',
            ],
        ];

        foreach ($definitions as $def) {
            Supplier::firstOrCreate(
                ['ruc' => $def['ruc']],
                array_merge($def, ['is_active' => true])
            );
        }
    }
}

