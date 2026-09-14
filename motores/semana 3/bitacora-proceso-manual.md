# Creación de Base de Datos

## Apertura de las bases de datos en terminal

Para la apertura de las bases de datos en cada motor, se accedió a los motores de bases de datos por medio de la terminal de Ubuntu con las credenciales definidas previamente y se ejecutaron los siguientes comandos:

### MySQL

```sql
CREATE DATABASE MovilCare;
```

### PostgreSQL

```postgres
CREATE DATABASE movilcare;
```

### MSSQL Server

```sql
CREATE DATABASE movilcare;

GO
```

### Ejecución

![Apertura de las bases de datos](./evidencias/creacion%20de%20base%20de%20datos.png)

### Evidencia

![Bases de datos abiertas](./evidencias/bds_creadas.png)

## Anotaciones

Para la creación de las bases de datos se establecieron las siguientes convenciones:

- Las entidades se representan como objetos utilizando **mayúscula inicial y singular**, por ejemplo: `Product`, `Customer` y `Sale`.
- Las tablas se representan utilizando **minúsculas y plural**, por ejemplo: `products`, `customers` y `sales`.
- Los nombres de las tablas y sus atributos se encuentran en **inglés**.
- Los atributos utilizan la nomenclatura **snake_case**, por ejemplo: `created_at` y `document_number`.
- La llave primaria de todas las tablas se denomina `id`.
- Los identificadores que pueden almacenar una gran cantidad de registros utilizan el tipo `BIGINT`.
- Las claves foráneas utilizan el nombre de la tabla relacionada en singular seguido de `_id`, por ejemplo: `customer_id`.
- Los campos `created_at` y `updated_at` se utilizan para registrar la fecha de creación y última actualización de los registros.
- Los campos que deben ser únicos se identifican mediante la restricción `UNIQUE`.
- Al finalizar la creación de las tablas se debe generar y visualizar el diagrama de la base de datos.

---

# Tablas

MovilCare es un sistema de gestión para empresas dedicadas a la comercialización, garantía y servicio técnico de productos. La plataforma permite administrar productos, clientes, ventas, unidades serializadas, órdenes de servicio, diagnósticos, repuestos, consumos y pagos, centralizando la información necesaria para gestionar el ciclo de atención al cliente.

Sus entidades y tablas son:

| Entidad | Tabla | Atributos / claves sugeridos |
|---|---|---|
| Product | `products` | `id`, `sku (UQ)`, `name`, `description`, `price`, `is_active`, `created_at`, `updated_at` |
| SerializedUnit | `serialized_units` | `id`, `name`, `description`, `is_active`, `created_at`, `updated_at` |
| Customer | `customers` | `id`, `document_type`, `document_number (UQ)`, `name`, `phone`, `email`, `is_active`, `created_at`, `updated_at` |
| Sale | `sales` | `id`, `customer_id (FK)`, `date`, `subtotal`, `taxes`, `total`, `status`, `created_at`, `updated_at` |
| SaleDetail | `sale_details` | `id`, `sale_id (FK)`, `product_id (FK)`, `quantity`, `unit_price`, `total`, `observations`, `created_at`, `updated_at` |
| Warranty | `warranties` | `id`, `name`, `description`, `is_active`, `created_at`, `updated_at` |
| ServiceOrder | `service_orders` | `id`, `customer_id (FK)`, `resource_id (FK)`, `number (UQ)`, `opened_at`, `closed_at`, `total`, `status`, `created_at`, `updated_at` |
| Diagnostic | `diagnostics` | `id`, `name`, `description`, `is_active`, `created_at`, `updated_at` |
| SparePart | `spare_parts` | `id`, `name`, `description`, `is_active`, `created_at`, `updated_at` |
| SparePartConsumption | `spare_part_consumption` | `id`, `name`, `description`, `is_active`, `created_at`, `updated_at` |
| Payment | `payments` | `id`, `reference_type`, `reference_id`, `method`, `amount`, `date`, `status`, `created_at`, `updated_at` |

> **Nota:** `resource_id` aparece como clave foránea en el modelo original, pero la entidad `Resource` no se encuentra definida dentro de las entidades proporcionadas. Por esta razón, la columna se incluye como atributo, pero la restricción `FOREIGN KEY` deberá establecerse cuando exista la tabla `resources`.

---

# Base de datos en MySQL - Scripts DBeaver

## 1. Creación de la tabla Products

La tabla `products` almacena la información general de los productos comercializados por MovilCare.

### Código

```sql
CREATE TABLE products (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    sku VARCHAR(100) NOT NULL UNIQUE,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    price DECIMAL(15,2) NOT NULL,

    status ENUM('active','inactive') DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

);
```

### Evidencia

![alt text](./evidencias/scripts-mysql/image.png)

---

## 2. Creación de la tabla SerializedUnits

La tabla `serialized_units` almacena las unidades individuales que requieren identificación y seguimiento dentro del sistema.

### Código

```sql
CREATE TABLE serialized_units (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    status ENUM('active','inactive') DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

);
```

### Evidencia

![alt text](./evidencias/scripts-mysql/image-1.png)

---

## 3. Creación de la tabla Customers

La tabla `customers` almacena la información de los clientes registrados en el sistema.

### Código

```sql
CREATE TABLE customers (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    document_type VARCHAR(30) NOT NULL,

    document_number VARCHAR(11) NOT NULL UNIQUE,

    name VARCHAR(150) NOT NULL,

    phone VARCHAR(30),

    email VARCHAR(150),

    status ENUM('active','inactive') DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

);
```

### Evidencia

![alt text](./evidencias/scripts-mysql/image-2.png)

---

## 4. Creación de la tabla Sales

La tabla `sales` registra las ventas realizadas y las relaciona con el cliente correspondiente.

### Código

```sql
CREATE TABLE sales (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    subtotal DECIMAL(15,2) NOT NULL,

    taxes DECIMAL(15,2) NOT NULL DEFAULT 0,

    total DECIMAL(15,2) NOT NULL,

    status ENUM('active','inactive') DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sales_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)

);
```

### Evidencia

![alt text](./evidencias/scripts-mysql/image-3.png)

---

## 5. Creación de la tabla SaleDetails

La tabla `sale_details` contiene los productos incluidos en cada venta, su cantidad, precio unitario y valor total.

### Código

```sql
CREATE TABLE sale_details (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    sale_id BIGINT NOT NULL,

    product_id BIGINT NOT NULL,

    quantity DECIMAL(15,3) NOT NULL,

    unit_price DECIMAL(15,2) NOT NULL,

    total DECIMAL(15,2) NOT NULL,

    observations TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_sale_details_sale
        FOREIGN KEY (sale_id)
        REFERENCES sales(id),

    CONSTRAINT fk_sale_details_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)

);
```

### Evidencia

![alt text](./evidencias/scripts-mysql/image-4.png)

---

## 6. Creación de la tabla Warranties

La tabla `warranties` almacena la información relacionada con las garantías ofrecidas por MovilCare.

### Código

```sql
CREATE TABLE warranties (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    status ENUM('active','inactive') DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

);
```

### Evidencia

![alt text](./evidencias/scripts-mysql/image-5.png)

---

## 7. Creación de la tabla ServiceOrders

La tabla `service_orders` almacena las órdenes de servicio generadas para la atención de los clientes.

### Código

```sql
CREATE TABLE service_orders (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    resource_id BIGINT,

    number VARCHAR(50) NOT NULL UNIQUE,

    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    closed_at DATETIME,

    total DECIMAL(15,2) NOT NULL DEFAULT 0,

    status ENUM('active','inactive') DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_service_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)

);
```

### Evidencia

![alt text](./evidencias/scripts-mysql/image-6.png)

---

## 8. Creación de la tabla Diagnostics

La tabla `diagnostics` almacena los diagnósticos utilizados durante los procesos de servicio técnico.

### Código

```sql
CREATE TABLE diagnostics (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    status ENUM('active','inactive') DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

);
```

### Evidencia

![alt text](./evidencias/scripts-mysql/image-7.png)

---

## 9. Creación de la tabla SpareParts

La tabla `spare_parts` almacena la información de los repuestos utilizados en los procesos de servicio técnico.

### Código

```sql
CREATE TABLE spare_parts (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    status ENUM('active','inactive') DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

);
```

### Evidencia

![alt text](./evidencias/scripts-mysql/image-8.png)

---

## 10. Creación de la tabla SparePartConsumptions

La tabla `spare_part_consumptions` registra la información relacionada con el consumo de repuestos.

### Código

```sql
CREATE TABLE spare_part_consumptions (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    status ENUM('active','inactive') DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

);
```

### Evidencia

![alt text](./evidencias/scripts-mysql/image-9.png)

---

## 11. Creación de la tabla Payments

La tabla `payments` almacena los pagos realizados y la referencia al registro al que corresponde cada pago.

### Código

```sql
CREATE TABLE payments (

    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    reference_type VARCHAR(50) NOT NULL,

    reference_id BIGINT NOT NULL,

    method VARCHAR(50) NOT NULL,

    amount DECIMAL(15,2) NOT NULL,

    date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    status ENUM('active','inactive') DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

);
```

### Evidencia

![alt text](./evidencias/scripts-mysql/image-10.png)

---

## Diagrama de la base de datos

Una vez creadas todas las tablas y establecidas las relaciones correspondientes, se procede a visualizar el diagrama de la base de datos en DBeaver.

### Evidencia

![alt text](./evidencias/scripts-mysql/image-11.png)
![alt text](./evidencias/scripts-mysql/image-12.png)

# Base de datos en PostgreSQL - Terminal DBeaver

Para la implementación de la base de datos MovilCare en PostgreSQL se utilizó DBeaver como herramienta de administración. Se mantuvo la misma estructura lógica implementada previamente en MySQL, adaptando únicamente los tipos de datos y elementos de sintaxis correspondientes al motor PostgreSQL.

## 1. Creación de la tabla Products

La tabla `products` almacena la información general de los productos comercializados por MovilCare.

### Código

```sql
CREATE TABLE products (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sku VARCHAR(100) NOT NULL UNIQUE,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    price NUMERIC(15,2) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);
```

### Evidencia

![Crear productos en terminal PostgreSQL](image-1.png)

---

## 2. Creación de la tabla SerializedUnits

La tabla `serialized_units` almacena las unidades individuales que requieren identificación y seguimiento dentro del sistema.

### Código

```sql
CREATE TABLE serialized_units (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);
```

### Evidencia

![Crear unidades serializadas en terminal PostgreSQL](image-2.png)

---

## 3. Creación de la tabla Customers

La tabla `customers` almacena la información de los clientes registrados en el sistema.

### Código

```sql
CREATE TABLE customers (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    document_type VARCHAR(30) NOT NULL,

    document_number VARCHAR(50) NOT NULL UNIQUE,

    name VARCHAR(150) NOT NULL,

    phone VARCHAR(30),

    email VARCHAR(150),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);
```

### Evidencia

![Crear clientes en terminal PostgreSQL](image-3.png)

---

## 4. Creación de la tabla Sales

La tabla `sales` registra las ventas realizadas y las relaciona con el cliente correspondiente mediante la clave foránea `customer_id`.

### Código

```sql
CREATE TABLE sales (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    subtotal NUMERIC(15,2) NOT NULL,

    taxes NUMERIC(15,2) NOT NULL DEFAULT 0,

    total NUMERIC(15,2) NOT NULL,

    status VARCHAR(30) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sales_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)

);
```

### Evidencia

![Crear ventas en terminal PostgreSQL](image-4.png)

---

## 5. Creación de la tabla SaleDetails

La tabla `sale_details` contiene el detalle de los productos incluidos en cada venta, incluyendo cantidad, precio unitario, total y observaciones.

### Código

```sql
CREATE TABLE sale_details (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    sale_id BIGINT NOT NULL,

    product_id BIGINT NOT NULL,

    quantity NUMERIC(15,3) NOT NULL,

    unit_price NUMERIC(15,2) NOT NULL,

    total NUMERIC(15,2) NOT NULL,

    observations TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sale_details_sale
        FOREIGN KEY (sale_id)
        REFERENCES sales(id),

    CONSTRAINT fk_sale_details_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)

);
```

### Evidencia

![Crear detalles de venta en terminal PostgreSQL](image-5.png)

---

## 6. Creación de la tabla Warranties

La tabla `warranties` almacena la información relacionada con las garantías ofrecidas por MovilCare.

### Código

```sql
CREATE TABLE warranties (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);
```

### Evidencia

![Crear garantías en terminal PostgreSQL](image-6.png)
---

## 7. Creación de la tabla ServiceOrders

La tabla `service_orders` almacena las órdenes de servicio generadas para la atención de los clientes.

### Código

```sql
CREATE TABLE service_orders (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    resource_id BIGINT,

    number VARCHAR(50) NOT NULL UNIQUE,

    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    closed_at TIMESTAMP,

    total NUMERIC(15,2) NOT NULL DEFAULT 0,

    status VARCHAR(30) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_service_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)

);
```

### Evidencia

![Crear órdenes de servicio en terminal PostgreSQL](image-7.png)

> **Nota:** `resource_id` se conserva debido a que forma parte del modelo original. Sin embargo, no se establece la restricción `FOREIGN KEY` porque la tabla `resources` no se encuentra definida actualmente en el modelo.

---

## 8. Creación de la tabla Diagnostics

La tabla `diagnostics` almacena la información relacionada con los diagnósticos realizados durante los procesos de servicio técnico.

### Código

```sql
CREATE TABLE diagnostics (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);
```

### Evidencia

![Crear diagnósticos en terminal PostgreSQL](image-8.png)

---

## 9. Creación de la tabla SpareParts

La tabla `spare_parts` almacena la información de los repuestos utilizados en los procesos de servicio técnico.

### Código

```sql
CREATE TABLE spare_parts (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);
```

### Evidencia

![Crear repuestos en terminal PostgreSQL](image-9.png)

---

## 10. Creación de la tabla SparePartConsumptions

La tabla `spare_part_consumptions` almacena la información relacionada con el consumo de repuestos.

### Código

```sql
CREATE TABLE spare_part_consumptions (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);
```

### Evidencia

![Crear consumos de repuestos en terminal PostgreSQL](image-10.png)

---

## 11. Creación de la tabla Payments

La tabla `payments` almacena los pagos realizados y la referencia al registro al que corresponde cada pago.

### Código

```sql
CREATE TABLE payments (

    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    reference_type VARCHAR(50) NOT NULL,

    reference_id BIGINT NOT NULL,

    method VARCHAR(50) NOT NULL,

    amount NUMERIC(15,2) NOT NULL,

    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    status VARCHAR(30) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

);
```

### Evidencia

![Crear pagos en terminal PostgreSQL](image-11.png)

---

# Diagrama de la base de datos

Una vez creadas todas las tablas y establecidas las relaciones correspondientes, se procede a visualizar el diagrama de la base de datos en DBeaver.

### Evidencia

![Diagrama de la base de datos MovilCare en PostgreSQL](image-13.png)

![alt text](./evidencias/scripts-postgres/image-12.png)
---

# Consideraciones de PostgreSQL

Durante la implementación de MovilCare en PostgreSQL se realizaron las siguientes adaptaciones respecto a la versión de MySQL:

| MySQL | PostgreSQL |
|---|---|
| `BIGINT AUTO_INCREMENT` | `BIGINT GENERATED ALWAYS AS IDENTITY` |
| `DECIMAL(15,2)` | `NUMERIC(15,2)` |
| `DATETIME` | `TIMESTAMP` |
| `BOOLEAN` | `BOOLEAN` |
| `DEFAULT CURRENT_TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` |
| `ON UPDATE CURRENT_TIMESTAMP` | No existe de forma nativa |

> **Nota:** PostgreSQL no dispone de `ON UPDATE CURRENT_TIMESTAMP` como MySQL. Por esta razón, `updated_at` se inicializa con `CURRENT_TIMESTAMP`, pero para actualizar automáticamente este campo cuando se modifique un registro será necesario implementar posteriormente un **trigger**.

# Base de datos en MSSQL Server - Terminal DBeaver

Para la implementación de la base de datos MovilCare en MSSQL Server se utilizó DBeaver como herramienta de administración y ejecución de scripts SQL.

Se mantuvo la misma estructura lógica utilizada en los motores anteriores, realizando las adaptaciones correspondientes a los tipos de datos y características propias de SQL Server.

## 1. Creación de la tabla Products

La tabla `products` almacena la información general de los productos comercializados por el sistema.

### Script SQL

```sql
CREATE TABLE products (

    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    sku VARCHAR(100) NOT NULL UNIQUE,

    name VARCHAR(150) NOT NULL,

    description VARCHAR(MAX),

    price DECIMAL(15,2) NOT NULL,

    status VARCHAR(10) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_products_status
        CHECK (status IN ('active', 'inactive'))

);
```

### Evidencia

![Crear products en MSSQL Server](./evidencias/scripts-mssql/image-14.png)


## 2. Creación de la tabla Serialized Units

La tabla `serialized_units` almacena información relacionada con las unidades que requieren identificación individual dentro del sistema.

### Script SQL

```sql
CREATE TABLE serialized_units (

    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description VARCHAR(MAX),

    status VARCHAR(10) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_serialized_units_status
        CHECK (status IN ('active', 'inactive'))

);
```

### Evidencia

![Crear serialized_units en MSSQL Server](./evidencias/scripts-mssql/image-15.png)


## 3. Creación de la tabla Customers

La tabla `customers` almacena la información de los clientes registrados en el sistema.

### Script SQL

```sql
CREATE TABLE customers (

    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    document_type VARCHAR(30) NOT NULL,

    document_number VARCHAR(50) NOT NULL UNIQUE,

    name VARCHAR(150) NOT NULL,

    phone VARCHAR(30),

    email VARCHAR(150),

    status VARCHAR(10) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_customers_status
        CHECK (status IN ('active', 'inactive'))

);
```

### Evidencia

![Crear customers en MSSQL Server](./evidencias/scripts-mssql/image-1.png)


## 4. Creación de la tabla Sales

La tabla `sales` registra las ventas realizadas y las relaciona con el cliente correspondiente.

### Script SQL

```sql
CREATE TABLE sales (

    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    subtotal DECIMAL(15,2) NOT NULL,

    taxes DECIMAL(15,2) NOT NULL DEFAULT 0,

    total DECIMAL(15,2) NOT NULL,

    status VARCHAR(10) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sales_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id),

    CONSTRAINT chk_sales_status
        CHECK (status IN ('active', 'inactive'))

);
```

### Evidencia

![Crear sales en MSSQL Server](./evidencias/scripts-mssql/image-2.png)


## 5. Creación de la tabla Sale Details

La tabla `sale_details` contiene el detalle de los productos incluidos en cada venta.

### Script SQL

```sql
CREATE TABLE sale_details (

    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    sale_id BIGINT NOT NULL,

    product_id BIGINT NOT NULL,

    quantity DECIMAL(15,3) NOT NULL,

    unit_price DECIMAL(15,2) NOT NULL,

    total DECIMAL(15,2) NOT NULL,

    observations VARCHAR(MAX),

    status VARCHAR(10) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sale_details_sale
        FOREIGN KEY (sale_id)
        REFERENCES sales(id),

    CONSTRAINT fk_sale_details_product
        FOREIGN KEY (product_id)
        REFERENCES products(id),

    CONSTRAINT chk_sale_details_status
        CHECK (status IN ('active', 'inactive'))

);
```

### Evidencia

![Crear sale_details en MSSQL Server](./evidencias/scripts-mssql/image-3.png)

## 6. Creación de la tabla Warranties

La tabla `warranties` almacena la información relacionada con las garantías disponibles dentro del sistema.

### Script SQL

```sql
CREATE TABLE warranties (

    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description VARCHAR(MAX),

    status VARCHAR(10) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_warranties_status
        CHECK (status IN ('active', 'inactive'))

);
```

### Evidencia

![Crear warranties en MSSQL Server](./evidencias/scripts-mssql/image-4.png)


## 7. Creación de la tabla Service Orders

La tabla `service_orders` registra las órdenes de servicio y su relación con los clientes.

### Script SQL

```sql
CREATE TABLE service_orders (

    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    resource_id BIGINT,

    number VARCHAR(50) NOT NULL UNIQUE,

    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    closed_at DATETIME,

    total DECIMAL(15,2) NOT NULL DEFAULT 0,

    status VARCHAR(10) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_service_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id),

    CONSTRAINT chk_service_orders_status
        CHECK (status IN ('active', 'inactive'))

);
```

### Evidencia

![Crear service_orders en MSSQL Server](./evidencias/scripts-mssql/image-5.png)

## 8. Creación de la tabla Diagnostics

La tabla `diagnostics` almacena los diagnósticos utilizados dentro de los procesos de servicio técnico.

### Script SQL

```sql
CREATE TABLE diagnostics (

    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description VARCHAR(MAX),

    status VARCHAR(10) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_diagnostics_status
        CHECK (status IN ('active', 'inactive'))

);
```

### Evidencia

![Crear diagnostics en MSSQL Server](./evidencias/scripts-mssql/image-6.png)


## 9. Creación de la tabla Spare Parts

La tabla `spare_parts` almacena la información de los repuestos utilizados en los procesos de mantenimiento y reparación.

### Script SQL

```sql
CREATE TABLE spare_parts (

    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description VARCHAR(MAX),

    status VARCHAR(10) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_spare_parts_status
        CHECK (status IN ('active', 'inactive'))

);
```

### Evidencia

![Crear spare_parts en MSSQL Server](./evidencias/scripts-mssql/image-7.png)


## 10. Creación de la tabla Spare Part Consumptions

La tabla `spare_part_consumptions` almacena información relacionada con el consumo de repuestos.

### Script SQL

```sql
CREATE TABLE spare_part_consumptions (

    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    description VARCHAR(MAX),

    status VARCHAR(10) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_spare_part_consumptions_status
        CHECK (status IN ('active', 'inactive'))

);
```

### Evidencia

![Crear spare_part_consumptions en MSSQL Server](./evidencias/scripts-mssql/image-8.png)


## 11. Creación de la tabla Payments

La tabla `payments` registra los pagos realizados y permite identificar el tipo y registro al que pertenece cada pago.

### Script SQL

```sql
CREATE TABLE payments (

    id BIGINT IDENTITY(1,1) PRIMARY KEY,

    reference_type VARCHAR(50) NOT NULL,

    reference_id BIGINT NOT NULL,

    method VARCHAR(50) NOT NULL,

    amount DECIMAL(15,2) NOT NULL,

    date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    status VARCHAR(10) NOT NULL DEFAULT 'active',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_payments_status
        CHECK (status IN ('active', 'inactive'))

);
```

### Evidencia

![Crear payments en MSSQL Server](./evidencias/scripts-mssql/image-9.png)

# Diagrama de la base de datos

Una vez creadas todas las tablas y establecidas las relaciones correspondientes, se procede a visualizar el diagrama de la base de datos en DBeaver.

### Evidencia

![Diagrama de la base de datos MovilCare en MSSQL Server](./evidencias/scripts-mssql/image-10.png)


---

# Consideraciones de MSSQL Server

Durante la implementación de MovilCare en MSSQL Server se realizaron las siguientes adaptaciones respecto a los demás motores:

| MySQL | PostgreSQL | MSSQL Server |
|---|---|---|
| `BIGINT AUTO_INCREMENT` | `BIGINT GENERATED ALWAYS AS IDENTITY` | `BIGINT IDENTITY(1,1)` |
| `DECIMAL(15,2)` | `NUMERIC(15,2)` | `DECIMAL(15,2)` |
| `DECIMAL(15,3)` | `NUMERIC(15,3)` | `DECIMAL(15,3)` |
| `DATETIME` | `TIMESTAMP` | `DATETIME` |
| `BOOLEAN` | `BOOLEAN` | `BIT` |
| `ENUM('active','inactive')` | `ENUM` | `VARCHAR(10)` + `CHECK` |
| `TEXT` | `TEXT` | `VARCHAR(MAX)` |
| `CURRENT_TIMESTAMP` | `CURRENT_TIMESTAMP` | `CURRENT_TIMESTAMP` |
| `ON UPDATE CURRENT_TIMESTAMP` | No existe de forma nativa | No existe de forma nativa |

> **Nota:** SQL Server no dispone de un tipo de dato `ENUM` nativo. Para mantener la restricción de los valores permitidos, se utilizó `VARCHAR(10)` acompañado de una restricción `CHECK`, permitiendo únicamente los valores `'active'` e `'inactive'`.

> **Nota:** SQL Server tampoco dispone de una cláusula equivalente a `ON UPDATE CURRENT_TIMESTAMP`. Por esta razón, `updated_at` se inicializa automáticamente con la fecha y hora de creación del registro. Para actualizar este campo automáticamente cuando se modifique un registro, sería necesario implementar un **trigger**.

## Resumen de la implementación

La estructura lógica de MovilCare se mantuvo equivalente a las implementaciones realizadas en los diferentes motores de bases de datos.

Las relaciones implementadas fueron:

- `sales.customer_id` → `customers.id`
- `sale_details.sale_id` → `sales.id`
- `sale_details.product_id` → `products.id`
- `service_orders.customer_id` → `customers.id`

Todas las tablas cuentan con una columna `status` que permite controlar su estado mediante los valores:

- `active`
- `inactive`

De esta manera, se mantiene una estructura consistente del modelo de datos entre los diferentes motores de bases de datos.

# Base de datos en Oracle - Terminal DBeaver

Para la implementación de la base de datos MovilCare en Oracle se utilizó DBeaver como herramienta de administración y ejecución de scripts SQL.

Se mantuvo la misma estructura lógica utilizada en MySQL, PostgreSQL y MSSQL Server, realizando las adaptaciones correspondientes a los tipos de datos, generación de identificadores y restricciones propias del motor Oracle.

## Apertura de la base de datos en Oracle

A diferencia de MySQL, PostgreSQL y MSSQL Server, en Oracle la organización de los datos se realiza principalmente mediante **usuarios y esquemas**. Por esta razón, para la implementación de MovilCare se utilizó el esquema correspondiente al usuario previamente configurado para el proyecto.

Una vez establecida la conexión desde DBeaver, se seleccionó el esquema de trabajo y se procedió con la creación de las tablas.

### Evidencia

![Conexión a Oracle en DBeaver](image-1.png)
---

## 1. Creación de la tabla Products

La tabla `products` almacena la información general de los productos comercializados por MovilCare.

### Código

```sql
CREATE TABLE products (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku VARCHAR2(100) NOT NULL UNIQUE,
    name VARCHAR2(150) NOT NULL,
    description CLOB,
    price NUMBER(15,2) NOT NULL,
    status VARCHAR2(10) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_products_status
        CHECK (status IN ('active', 'inactive'))
);
```

### Evidencia

![Crear products en Oracle ](image-2.png)

## 2. Creación de la tabla Serialized Units

La tabla `serialized_units` almacena información relacionada con las unidades que requieren identificación individual dentro del sistema.

### Script SQL

```sql
CREATE TABLE serialized_units (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(150) NOT NULL,
    description CLOB,
    status VARCHAR2(10) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_serialized_units_status
        CHECK (status IN ('active', 'inactive'))
);
```

### Evidencia

![Crear serialized_units en Oracle ](image-3.png)


## 3. Creación de la tabla Customers

La tabla `customers` almacena la información de los clientes registrados en el sistema.

### Script SQL

```sql
CREATE TABLE customers (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_type VARCHAR2(30) NOT NULL,
    document_number VARCHAR2(50) NOT NULL UNIQUE,
    name VARCHAR2(150) NOT NULL,
    phone VARCHAR2(30),
    email VARCHAR2(150),
    status VARCHAR2(10) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_customers_status
        CHECK (status IN ('active', 'inactive'))
);
```

### Evidencia

![Crear customers en Oracle ](image-4.png)


## 4. Creación de la tabla Sales

La tabla `sales` registra las ventas realizadas y las relaciona con el cliente correspondiente.

### Script SQL

```sql
CREATE TABLE sales (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id NUMBER(19) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    subtotal NUMBER(15,2) NOT NULL,
    taxes NUMBER(15,2) DEFAULT 0 NOT NULL,
    total NUMBER(15,2) NOT NULL,
    status VARCHAR2(10) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_sales_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id),
    CONSTRAINT chk_sales_status
        CHECK (status IN ('active', 'inactive'))
);
```

### Evidencia

![Crear sales en Oracle ](image-5.png)


## 5. Creación de la tabla Sale Details

La tabla `sale_details` contiene el detalle de los productos incluidos en cada venta.

### Script SQL

```sql
CREATE TABLE sale_details (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id NUMBER(19) NOT NULL,
    product_id NUMBER(19) NOT NULL,
    quantity NUMBER(15,3) NOT NULL,
    unit_price NUMBER(15,2) NOT NULL,
    total NUMBER(15,2) NOT NULL,
    observations CLOB,
    status VARCHAR2(10) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT fk_sale_details_sale
        FOREIGN KEY (sale_id)
        REFERENCES sales(id),

    CONSTRAINT fk_sale_details_product
        FOREIGN KEY (product_id)
        REFERENCES products(id),

    CONSTRAINT chk_sale_details_status
        CHECK (status IN ('active', 'inactive'))
);
```

### Evidencia

![Crear sale_details en Oracle ](image-6.png)

## 6. Creación de la tabla Warranties

La tabla `warranties` almacena la información relacionada con las garantías disponibles dentro del sistema.

### Script SQL

```sql
CREATE TABLE warranties (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(150) NOT NULL,
    description CLOB,
    status VARCHAR2(10) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_warranties_status
        CHECK (status IN ('active', 'inactive'))
);
```

### Evidencia

![Crear warranties en Oracle ](image-7.png)


## 7. Creación de la tabla Service Orders

La tabla `service_orders` registra las órdenes de servicio y su relación con los clientes.

### Script SQL

```sql
CREATE TABLE service_orders (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id NUMBER(19) NOT NULL,
    resource_id NUMBER(19),
    service_order_number VARCHAR2(50) NOT NULL UNIQUE,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at TIMESTAMP,
    total NUMBER(15,2) DEFAULT 0 NOT NULL,
    status VARCHAR2(10) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT fk_service_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id),

    CONSTRAINT chk_service_orders_status
        CHECK (status IN ('active', 'inactive'))
);
```

### Evidencia

![Crear service_orders en Oracle ](image-8.png)

## 8. Creación de la tabla Diagnostics

La tabla `diagnostics` almacena los diagnósticos utilizados dentro de los procesos de servicio técnico.

### Script SQL

```sql
CREATE TABLE diagnostics (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(150) NOT NULL,
    description CLOB,
    status VARCHAR2(10) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_diagnostics_status
        CHECK (status IN ('active', 'inactive'))
);
```

### Evidencia

![Crear diagnostics en Oracle ](image-9.png)


## 9. Creación de la tabla Spare Parts

La tabla `spare_parts` almacena la información de los repuestos utilizados en los procesos de mantenimiento y reparación.

### Script SQL

```sql
CREATE TABLE spare_parts (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(150) NOT NULL,
    description CLOB,
    status VARCHAR2(10) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_spare_parts_status
        CHECK (status IN ('active', 'inactive'))
);
```

### Evidencia

![Crear spare_parts en Oracle ](image-10.png)

## 10. Creación de la tabla Spare Part Consumptions

La tabla `spare_part_consumptions` almacena información relacionada con el consumo de repuestos.

### Script SQL

```sql
CREATE TABLE spare_part_consumptions (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR2(150) NOT NULL,
    description CLOB,
    status VARCHAR2(10) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_spare_part_consumptions_status
        CHECK (status IN ('active', 'inactive'))
);
```

### Evidencia

![Crear spare_part_consumptions en Oracle ](image-11.png)


## 11. Creación de la tabla Payments

La tabla `payments` registra los pagos realizados y permite identificar el tipo y registro al que pertenece cada pago.

### Script SQL

```sql
CREATE TABLE payments (
    id NUMBER(19) GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reference_type VARCHAR2(50) NOT NULL,
    reference_id NUMBER(19) NOT NULL,
    method VARCHAR2(50) NOT NULL,
    amount NUMBER(15,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status VARCHAR2(10) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_payments_status
        CHECK (status IN ('active', 'inactive'))
);
```

### Evidencia

![Crear payments en Oracle ](image-12.png)

# Diagrama de la base de datos

Una vez creadas todas las tablas y establecidas las relaciones correspondientes, se procede a visualizar el diagrama de la base de datos en DBeaver.

### Evidencia

![Diagrama de la base de datos MovilCare en Oracle ](image-13.png)


---

## Consideraciones de Oracle
durante la implementacion de MovilCare en Oracle se realizaron adaptaciones respecto a los demas motores:

| MySQL                         | PostgreSQL                            | MSSQL Server              | Oracle                                       |
| ----------------------------- | ------------------------------------- | ------------------------- | -------------------------------------------- |
| `BIGINT AUTO_INCREMENT`       | `BIGINT GENERATED ALWAYS AS IDENTITY` | `BIGINT IDENTITY(1,1)`    | `NUMBER(19) GENERATED ALWAYS AS IDENTITY`    |
| `DECIMAL(15,2)`               | `NUMERIC(15,2)`                       | `DECIMAL(15,2)`           | `NUMBER(15,2)`                               |
| `DECIMAL(15,3)`               | `NUMERIC(15,3)`                       | `DECIMAL(15,3)`           | `NUMBER(15,3)`                               |
| `DATETIME`                    | `TIMESTAMP`                           | `DATETIME`                | `TIMESTAMP`                                  |
| `BOOLEAN`                     | `BOOLEAN`                             | `BIT`                     | `NUMBER(1)` / `CHAR(1)` según implementación |
| `ENUM('active','inactive')`   | `ENUM` / `VARCHAR` + `CHECK`          | `VARCHAR(10)` + `CHECK`   | `VARCHAR2(10)` + `CHECK`                     |
| `TEXT`                        | `TEXT`                                | `VARCHAR(MAX)`            | `CLOB`                                       |
| `VARCHAR`                     | `VARCHAR`                             | `VARCHAR`                 | `VARCHAR2`                                   |
| `CURRENT_TIMESTAMP`           | `CURRENT_TIMESTAMP`                   | `CURRENT_TIMESTAMP`       | `CURRENT_TIMESTAMP`                          |
| `ON UPDATE CURRENT_TIMESTAMP` | No existe de forma nativa             | No existe de forma nativa | No existe de forma nativa                    |

> **Nota:** Oracle no dispone de un tipo de dato ENUM equivalente al utilizado en MySQL. Para mantener la misma restricción lógica, la columna status se implementó mediante VARCHAR2(10) acompañada de una restricción CHECK, permitiendo únicamente los valores 'active' e 'inactive'.

> **Nota:** Oracle permite utilizar columnas de identidad mediante GENERATED ALWAYS AS IDENTITY, eliminando la necesidad de crear manualmente una secuencia y un trigger para la generación de los identificadores.

> **Nota:** Oracle no dispone de una cláusula equivalente a ON UPDATE CURRENT_TIMESTAMP. Por esta razón, updated_at se inicializa automáticamente con CURRENT_TIMESTAMP, pero su actualización automática ante modificaciones requeriría la implementación posterior de un trigger.

## Resumen de la implementación

La estructura lógica de MovilCare se mantuvo equivalente a las implementaciones realizadas en MySQL, PostgreSQL y MSSQL Server, adaptando únicamente los elementos propios del motor Oracle.

Las relaciones implementadas fueron:

- `sales.customer_id` → `customers.id`
- `sale_details.sale_id` → `sales.id`
- `sale_details.product_id` → `products.id`
- `service_orders.customer_id` → `customers.id`

De esta manera, se conserva una estructura de datos consistente entre los cuatro motores de bases de datos utilizados para la implementación de MovilCare: MySQL, PostgreSQL, MSSQL Server y Oracle.