## Orden recomendado de creación de tablas

> Solo nombres de tablas, ordenadas para que las FK ya existan cuando se creen.

1. **Organización / seguridad base**
   1. `zonals`
   2. `offices`
   3. `warehouses`
   4. `warehouse_locations`
   5. `repair_shops`
   6. `departments`
   7. `users`
   8. `roles`
   9. `permissions`
   10. `role_has_permissions` *(Spatie)*
   11. `model_has_roles` *(Spatie)*
   12. `model_has_permissions` *(Spatie)*

2. **Catálogo (plan de cuentas + categorías SUNAT + subcategorías TI)**
   13. `gl_accounts`
   14. `asset_categories`
   15. `asset_subcategories`
   16. `asset_brands`
   17. `asset_models`
   18. `component_types`

3. **Compras**
   19. `suppliers`
   20. `purchase_orders`
   21. `purchase_items`
   22. `invoices`

4. **Activos tecnológicos**
   23. `assets`
   24. `asset_computers`
   25. `asset_assignments`
   26. `asset_photos`

5. **Componentes**
   27. `components`
   28. `computer_components`

6. **Activos fijos no tecnológicos — principal (M16; categorías en asset_categories)**
   29. `fixed_assets`
   30. `fixed_asset_assignments`
   31. `fixed_asset_service_orders`
   32. `fixed_asset_depreciation_entries`
   33. `fixed_asset_inventory_counts`
   34. `fixed_asset_inventory_items`

7. **Logística (ingresos y traslados)**
   35. `stock_entries`
   36. `stock_entry_items`
   37. `asset_transfers`
   38. `transfer_items`

8. **Mantenimiento**
   39. `repair_tickets`
   40. `repair_parts`
   41. `repair_costs`
   42. `preventive_plans`
   43. `preventive_tasks`

9. **Bajas**
   44. `asset_disposals`
   45. `asset_sales`

10. **Inventario TI (conteos físicos)**
   46. `inventory_counts`
   47. `inventory_count_items`

11. **Alertas y notificaciones**
   48. `alert_rules`
   49. `alert_events`
   50. `notifications`

12. **Depreciación — activos tecnológicos**
   51. `depreciation_schedules`
   52. `depreciation_entries`

13. **Licencias de software**
   53. `software_vendors`
   54. `software_products`
   55. `software_licenses`
   56. `license_assignments`
   57. `software_installations`

14. **Auditoría**
   58. `audit_logs`
   59. `agent_reports`
   60. `agent_tokens`

15. **Seguridad e infraestructura**
   61. `login_attempts`
   62. `api_key_logs`
   63. `backup_logs`

