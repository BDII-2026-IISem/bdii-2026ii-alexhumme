# PROYECTO 23

## 23. MóvilCare - Venta y reparación de dispositivos

**Áreas:** Ventas / Garantías / Reparaciones / Inventario.

---

## NARRATIVA DEL PROYECTO

MóvilCare comercializa equipos y accesorios identificados por serial, y presta servicio técnico. La plataforma debe registrar ventas, garantías por artículo, recepción del dispositivo, diagnóstico, autorización del cliente y consumo de repuestos. La trazabilidad debe diferenciar garantía comercial, reparación pagada y reincidencia.

---

## ENTIDADES DE NEGOCIO

| Entidad de dominio | Atributos / claves sugeridos |
|---|---|
| **Producto** | id, sku (UQ), nombre, descripcion, precio, is_active |
| **UnidadSerializada** | id, producto_id (FK), serial (UQ), estado, created_at, updated_at |
| **Cliente** | id, tipo_documento, numero_documento (UQ), nombre, telefono, email, is_active |
| **Venta** | id, cliente_id (FK), fecha, subtotal, impuestos, total, estado |
| **VentaDetalle** | id, venta_id (FK), unidad_serializada_id (FK), cantidad, valor_unitario, total, observaciones |
| **Garantia** | id, venta_detalle_id (FK), fecha_inicio, fecha_fin, tipo, estado, descripcion |
| **OrdenServicio** | id, cliente_id (FK), unidad_serializada_id (FK), numero (UQ), fecha_apertura, fecha_cierre, total, estado |
| **Diagnostico** | id, orden_servicio_id (FK), descripcion, fecha, observaciones, estado |
| **Repuesto** | id, nombre, descripcion, precio, stock, is_active, created_at, updated_at |
| **ConsumoRepuesto** | id, orden_servicio_id (FK), repuesto_id (FK), cantidad, valor_unitario, subtotal |
| **Pago** | id, referencia_tipo, referencia_id, metodo, monto, fecha, estado |

---

## RELACIONES DE NEGOCIO

- Producto 1:N UnidadSerializada.
- Cliente 1:N Venta.
- Venta 1:N VentaDetalle.
- VentaDetalle 0..N Garantia.
- Cliente 1:N OrdenServicio.
- UnidadSerializada 1:N OrdenServicio.
- OrdenServicio 1:N Diagnostico.
- OrdenServicio N:M Repuesto mediante ConsumoRepuesto.
- Venta y OrdenServicio pueden tener uno o varios Pago.

---

## RBAC APLICADO

**Roles iniciales:**

- `ADMIN`
- `VENTAS`
- `RECEPCION_TECNICA`
- `TECNICO`
- `BODEGA`

**Recursos de referencia:**

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/ventas` | Registrar una venta. |
| POST | `/ordenes-servicio` | Registrar una orden de servicio. |
| POST | `/diagnosticos` | Registrar un diagnóstico técnico. |
| PATCH | `/garantias/:id` | Actualizar el estado o información de una garantía. |

---

## MÓDULOS DE NEGOCIO SUGERIDOS

```text
features/
└── business/
    ├── catalog/
    ├── serialized-stock/
    ├── sales/
    ├── warranties/
    ├── repairs/
    └── parts/