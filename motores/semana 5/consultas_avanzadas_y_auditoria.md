# CONSULTAS AVANZADAS

## GENERACIÓN DE DATOS EN MOCKAROO

Para la realización de las consultas se generaron registros aleatorios a partir de los esquemas de cada tabla en la plataforma Mockaroo. Los datos fueron generados en formato CSV para posteriormente ser importados en las bases de datos correspondientes.

### Products

**Evidencias**

![alt text](./image.png)
![alt text](./evidencias/mysql/image-1.png)

### Sales

**Evidencias**

![alt text](./evidencias/mysql/image-2.png)
![alt text](./evidencias/mysql/image-3.png)

### Customers

**Evidencias**

![alt text](./evidencias/mysql/image-4.png)
![alt text](./evidencias/mysql/image-5.png)

### Sale_details

**Evidencias**

![alt text](./evidencias/mysql/image-7.png)
![alt text](./evidencias/mysql/image-8.png)

---

# MYSQL

## Importación de los datos y las tablas

Para llevar a la base de datos la información generada en Mockaroo, los registros fueron guardados en formato CSV y posteriormente se seleccionó el archivo correspondiente para importar los datos de cada tabla desde DBeaver.

## 1. INSERT INTO

La sentencia `INSERT INTO` permite insertar nuevos registros en una tabla de la base de datos. En este caso se agregó un nuevo cliente indicando los valores correspondientes a sus datos personales y de contacto.

**Código:**

```sql
INSERT INTO customers (
    name,
    document_type,
    document_number,
    phone,
    email
) VALUES (
    'Mauricio',
    'CC',
    '1115525693',
    '3002285588',
    'mauci@gmail.com'
);
```

**Evidencia:**

![alt text](./evidencias/mysql/image-6.png)

---

## 2. SELECT *

La sentencia `SELECT` se utiliza para consultar información almacenada en una o varias tablas.

El símbolo `*` permite seleccionar todas las columnas de la tabla. También es posible indicar únicamente las columnas que se desean obtener.

**Código:**

```sql
SELECT *
FROM customers;
```

También se pueden seleccionar columnas específicas:

```sql
SELECT name, price
FROM products;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-9.png)

---

## 3. WHERE

La cláusula `WHERE` permite establecer condiciones para filtrar los registros que serán devueltos por una consulta.

Por ejemplo, se pueden consultar las ventas asociadas a un cliente específico:

```sql
SELECT *
FROM sales
WHERE customer_id = 1;
```

También se puede utilizar una condición sobre el valor total de una venta:

```sql
SELECT *
FROM sales
WHERE total < 250000;
```

Cuando se necesita consultar información relacionada entre varias tablas, se puede utilizar una condición que relacione las claves correspondientes:

```sql
SELECT sales.id, customers.name, sales.total
FROM sales, customers
WHERE sales.customer_id = customers.id;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-10.png)

![alt text](./evidencias/mysql/image-11.png)

![alt text](./evidencias/mysql/image-12.png)

---

## 4. JOIN

La cláusula `JOIN` permite combinar información de dos o más tablas mediante una relación entre sus columnas.

En este caso se relacionan las tablas `sales` y `customers` mediante `customer_id`:

```sql
SELECT 
    sales.id,
    customers.name,
    sales.date,
    sales.total
FROM sales
JOIN customers
    ON sales.customer_id = customers.id;
```

También es posible relacionar las ventas con sus detalles y productos:

```sql
SELECT
    sales.id AS sale_id,
    products.name AS product,
    sale_details.quantity,
    sale_details.unit_price,
    sale_details.total
FROM sales
JOIN sale_details
    ON sales.id = sale_details.sale_id
JOIN products
    ON sale_details.product_id = products.id;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-13.png)

![alt text](./evidencias/mysql/image-14.png)

---

## 5. AND

El operador `AND` permite combinar dos o más condiciones dentro de una consulta. Para que un registro sea incluido, todas las condiciones deben cumplirse.

Por ejemplo, se pueden consultar las ventas cuyo total sea superior a $100.000 y cuyo estado sea `active`:

```sql
SELECT *
FROM sales
WHERE total > 50
AND status = 'active';
```

También puede utilizarse para filtrar productos por precio y estado:

```sql
SELECT *
FROM products
WHERE price > 2000000
AND status = 'active';
```

**Evidencia:**

![alt text](./evidencias/mysql/image-15.png)
![alt text](./evidencias/mysql/image-16.png)

---

## 6. AS

La palabra reservada `AS` permite establecer alias para tablas o columnas. Los alias facilitan la lectura de las consultas y permiten utilizar nombres más cortos.

Por ejemplo:

```sql
SELECT
    customers.name AS customer_name,
    customers.email AS customer_email
FROM customers;
```

También puede utilizarse con tablas:

```sql
SELECT
    c.name,
    s.total
FROM customers AS c
JOIN sales AS s
    ON c.id = s.customer_id;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-17.png)
![alt text](./evidencias/mysql/image-18.png)

---

## 7. ON

La cláusula `ON` se utiliza principalmente junto con `JOIN` para establecer la condición mediante la cual se relacionan las tablas.

En la siguiente consulta se relacionan los clientes con sus ventas mediante `customer_id`:

```sql
SELECT
    c.name,
    s.id AS sale_id,
    s.total
FROM customers AS c
JOIN sales AS s
    ON c.id = s.customer_id;
```

En este caso, `ON c.id = s.customer_id` indica que el identificador del cliente debe coincidir con el `customer_id` almacenado en la tabla `sales`.

**Evidencia:**

![alt text](./evidencias/mysql/image-19.png)

---

## 8. ORDER BY

La cláusula `ORDER BY` permite ordenar los resultados de una consulta según una o varias columnas.

Por defecto, el orden es ascendente (`ASC`):

```sql
SELECT *
FROM products
ORDER BY price ASC;
```

También es posible ordenar de forma descendente utilizando `DESC`:

```sql
SELECT *
FROM products
ORDER BY price DESC;
```

Se pueden utilizar varias columnas para establecer diferentes criterios de ordenamiento:

```sql
SELECT *
FROM customers
ORDER BY name ASC, document_number ASC;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-20.png)
![alt text](./evidencias/mysql/image-21.png)
![alt text](./evidencias/mysql/image-22.png)

---

## 9. COMPARADORES LÓGICOS

Los operadores de comparación permiten establecer condiciones para seleccionar determinados registros.

Entre los principales operadores se encuentran:

- `=` igual
- `<>` diferente
- `>` mayor que
- `<` menor que
- `>=` mayor o igual que
- `<=` menor o igual que

Por ejemplo, para consultar productos cuyo precio sea mayor o igual a $100.000:

```sql
SELECT *
FROM products
WHERE price >= 100000;
```

Para consultar productos cuyo precio sea diferente de $50.000:

```sql
SELECT *
FROM products
WHERE price <> 50000;
```

También pueden combinarse con otros operadores:

```sql
SELECT *
FROM products
WHERE price >= 50000
AND price <= 200000;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-23.png)
![alt text](./evidencias/mysql/image-24.png)
![alt text](./evidencias/mysql/image-25.png)

---

## 10. GROUP BY

La cláusula `GROUP BY` permite agrupar registros que poseen el mismo valor en una o varias columnas. Es utilizada principalmente junto con funciones de agregación como `COUNT`, `SUM` y `AVG`.

Por ejemplo, se pueden agrupar las ventas según el cliente:

```sql
SELECT
    customer_id,
    COUNT(*) AS number_of_sales
FROM sales
GROUP BY customer_id;
```

También se puede agrupar el detalle de ventas según el producto:

```sql
SELECT
    product_id,
    SUM(quantity) AS quantity_sold
FROM sale_details
GROUP BY product_id;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-26.png)
![alt text](./evidencias/mysql/image-27.png)

---

## 11. COUNT

La función `COUNT` permite contar la cantidad de registros que cumplen una determinada condición.

Para conocer la cantidad total de clientes registrados:

```sql
SELECT COUNT(*) AS total_customers
FROM customers;
```

También puede utilizarse junto con `GROUP BY` para conocer la cantidad de ventas realizadas por cada cliente:

```sql
SELECT
    customer_id,
    COUNT(*) AS total_sales
FROM sales
GROUP BY customer_id;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-28.png)
![alt text](./evidencias/mysql/image-29.png)

---

## 12. SUM

La función `SUM` permite obtener la suma de los valores de una columna numérica.

Por ejemplo, para obtener el valor total de todas las ventas:

```sql
SELECT SUM(total) AS total_sales
FROM sales;
```

También puede utilizarse para conocer la cantidad total de unidades vendidas por producto:

```sql
SELECT
    product_id,
    SUM(quantity) AS total_quantity
FROM sale_details
GROUP BY product_id;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-30.png)
![alt text](./evidencias/mysql/image-31.png)

---

## 13. AVG

La función `AVG` permite calcular el promedio de los valores almacenados en una columna numérica.

Por ejemplo, para obtener el precio promedio de los productos:

```sql
SELECT AVG(price) AS average_price
FROM products;
```

También se puede obtener el promedio del valor de las ventas:

```sql
SELECT AVG(total) AS average_sale
FROM sales;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-32.png)
![alt text](./evidencias/mysql/image-33.png)

---

## 14. HAVING

La cláusula `HAVING` permite establecer condiciones sobre grupos de registros después de utilizar `GROUP BY`.

A diferencia de `WHERE`, que filtra registros antes de realizar la agrupación, `HAVING` permite filtrar los resultados obtenidos después de realizarla.

Por ejemplo, para mostrar únicamente los clientes que tengan más de una venta:

```sql
SELECT
    customer_id,
    COUNT(*) AS total_sales
FROM sales
GROUP BY customer_id
HAVING COUNT(*) > 1;
```

También puede utilizarse para encontrar productos cuya cantidad total vendida sea superior a 10 unidades:

```sql
SELECT
    product_id,
    SUM(quantity) AS total_quantity
FROM sale_details
GROUP BY product_id
HAVING SUM(quantity) > 10;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-34.png)
![alt text](./evidencias/mysql/image-36.png)

---

## 15. FUNCIONES DE AGREGACIÓN

Las funciones de agregación permiten realizar operaciones sobre un conjunto de registros y devolver un único resultado o un resultado por cada grupo.

Entre las funciones utilizadas se encuentran:

- `COUNT()` para contar registros.
- `SUM()` para sumar valores.
- `AVG()` para calcular promedios.
- `MIN()` para obtener el valor mínimo.
- `MAX()` para obtener el valor máximo.

Por ejemplo:

```sql
SELECT
    COUNT(*) AS total_products,
    AVG(price) AS average_price,
    MIN(price) AS minimum_price,
    MAX(price) AS maximum_price
FROM products;
```

**Evidencia:**

![alt text](./evidencias/mysql/image-37.png)

---

## 16. SUBCONSULTAS

Las subconsultas son consultas que se encuentran dentro de otra consulta. Permiten utilizar el resultado de una consulta como parte de otra operación.

Por ejemplo, se pueden consultar los productos cuyo precio sea superior al precio promedio de todos los productos:

```sql
SELECT
    name,
    price
FROM products
WHERE price > (
    SELECT AVG(price)
    FROM products
);
```

También se puede utilizar una subconsulta para consultar los clientes que hayan realizado al menos una venta:

```sql
SELECT
    name,
    document_number
FROM customers
WHERE id IN (
    SELECT customer_id
    FROM sales
);
```

**Evidencia:**

![alt text](./evidencias/mysql/image-38.png)
![alt text](./evidencias/mysql/image-39.png)

## 17. LIKE

El operador `LIKE` permite realizar búsquedas de texto utilizando patrones. Es especialmente útil cuando no se conoce exactamente el valor que se desea buscar.

El símbolo `%` representa cualquier cantidad de caracteres. Por ejemplo, para buscar clientes cuyo nombre comience con la letra `M`:

**Código:**

```sql
SELECT *
FROM customers
WHERE name LIKE 'M%';
```
También se puede utilizar `%` al inicio y al final para buscar un texto que aparezca en cualquier posición:

```sql
SELECT *
FROM customers
WHERE email LIKE '%gmail%';
```

En este caso se obtienen los clientes cuyo correo electrónico contiene la palabra gmail.

También es posible utilizar `_` , que representa un único carácter:

```sql
SELECT *
FROM customers
WHERE name LIKE 'M____'
   OR name LIKE 'M____ %';
```
Esta consulta busca nombres que comiencen con `M` y tengan cinco caracteres en total.

**Evidencia:**
![alt text](./evidencias/mysql/image-40.png)
![alt text](./evidencias/mysql/image-41.png)
![alt text](./evidencias/mysql/image-42.png)


## 18. CONSULTA AVANZADA COMBINADA

### Situación hipotética

La empresa MovilCare necesita generar un reporte para el área comercial que permita identificar los productos que presentan un movimiento significativo dentro de las ventas.

El reporte debe mostrar el nombre del producto, la cantidad de registros de venta en los que aparece y la cantidad total de unidades vendidas. Para que el resultado sea relevante, solamente se deben considerar los detalles de venta activos y los productos cuyo precio sea superior al precio promedio de todos los productos.

Además, se requiere mostrar únicamente los productos que hayan aparecido en al menos dos registros de venta y que hayan acumulado como mínimo 50 unidades vendidas.

Esta consulta combina diferentes conceptos estudiados anteriormente: `JOIN`, `ON`, `WHERE`, `AND`, `AS`, `GROUP BY`, `COUNT`, `SUM`, `AVG`, `HAVING`, `ORDER BY` y una subconsulta.

### Consulta

```sql
SELECT
    p.name AS product_name,
    COUNT(sd.id) AS number_of_sales,
    SUM(sd.quantity) AS total_quantity_sold
FROM products AS p
JOIN sale_details AS sd
    ON p.id = sd.product_id
WHERE sd.status = 'active'
AND p.price > (
    SELECT AVG(price)
    FROM products
)
GROUP BY p.id, p.name
HAVING COUNT(sd.id) >= 2
AND SUM(sd.quantity) >= 50
ORDER BY total_quantity_sold ASC;
```
**Ejecucion**
![alt text](image-2.png)

### Explicación

La consulta comienza relacionando `products` con `sale_details` mediante `JOIN` y `ON`, utilizando `product_id` como clave de relación.

Posteriormente, `WHERE` permite filtrar únicamente los detalles de venta que se encuentran activos y los productos cuyo precio sea superior al promedio general de los productos. Para obtener este promedio se utiliza una subconsulta con `AVG()`.

Después, `GROUP BY` agrupa los resultados por producto. Sobre cada grupo se utilizan las funciones `COUNT()` y `SUM()` para determinar la cantidad de registros de venta y las unidades vendidas.

Finalmente, `HAVING` permite filtrar los grupos obtenidos, conservando únicamente aquellos productos que aparecen en dos o más ventas y que acumulan al menos 50 unidades. `ORDER BY` organiza los resultados de acuerdo con la cantidad total vendida.

### Creación del procedimiento

La consulta anterior se convirtió en un procedimiento almacenado para poder reutilizarla desde la base de datos.

Para este ejercicio se definieron como parámetros los valores mínimos de cantidad de ventas y unidades vendidas.

**Código utilizado para crear el procedimiento:**

```sql
DELIMITER $$

CREATE PROCEDURE sp_product_sales_report(
    IN p_min_sales INT,
    IN p_min_quantity DECIMAL(15,3)
)
BEGIN

    SELECT
        p.name AS product_name,
        COUNT(sd.id) AS number_of_sales,
        SUM(sd.quantity) AS total_quantity_sold
    FROM products AS p
    JOIN sale_details AS sd
        ON p.id = sd.product_id
    WHERE sd.status = 'active'
    AND p.price > (
        SELECT AVG(price)
        FROM products
    )
    GROUP BY p.id, p.name
    HAVING COUNT(sd.id) >= p_min_sales
    AND SUM(sd.quantity) >= p_min_quantity
    ORDER BY total_quantity_sold ASC;

END $$

DELIMITER ;
```

La utilización de parámetros permite modificar los criterios del reporte sin tener que crear nuevamente el procedimiento.

### Creación mediante DBeaver

Para la creación del procedimiento se utilizó la interfaz gráfica de DBeaver.

En el navegador de la base de datos se seleccionó:

**Base de datos → Schemas → Procedures → Create New Procedure**

En el formulario se estableció el nombre:

`sp_product_sales_report`

**Evidencia**
![alt text](image-3.png)

Posteriormente se agregaron los parámetros:

| Parámetro | Tipo | Dirección |
|---|---|---|
| `p_min_sales` | `INT` | IN |
| `p_min_quantity` | `DECIMAL(15,3)` | IN |

Finalmente se ingresó la consulta dentro del cuerpo del procedimiento y se ejecutó la opción correspondiente para crear el objeto en la base de datos.

**Evidencia:**

![alt text](image-4.png)

### Llamada al procedimiento

Una vez creado el procedimiento, se realizó una llamada utilizando como parámetros mínimos dos registros de venta y 50 unidades:

```sql
CALL sp_product_sales_report(2, 50);
```

**Evidencia:**

![alt text](image-5.png)

---

## 19. TEORÍA DE CONJUNTOS MEDIANTE SUBCONSULTAS

### Situación hipotética

El área comercial de MovilCare necesita identificar la relación entre los clientes registrados y los clientes que han realizado ventas.

Para este análisis se consideran dos conjuntos:

- **Conjunto C:** todos los clientes registrados en `customers`.
- **Conjunto S:** clientes que aparecen en la tabla `sales`.

A partir de estos conjuntos se pueden obtener diferentes operaciones mediante consultas y subconsultas.

### Intersección entre clientes y clientes con ventas

La primera consulta permite obtener los clientes que pertenecen a ambos conjuntos, es decir, clientes que están registrados y que además tienen al menos una venta.

```sql
SELECT *
FROM customers AS c
WHERE c.id IN (
    SELECT s.customer_id
    FROM sales AS s
);
```

En términos de teoría de conjuntos:

**C ∩ S**

La subconsulta obtiene los identificadores de los clientes que aparecen en `sales`, mientras que la consulta principal selecciona únicamente los clientes cuyo identificador pertenece a ese conjunto.

**Evidencia:**

![alt text](image-6.png)

---

### Diferencia entre clientes y clientes con ventas activas

El área comercial también puede necesitar conocer qué clientes registrados todavía no tienen ninguna venta activa.

```sql
SELECT *
FROM customers AS c
WHERE c.id NOT IN (
    SELECT s.customer_id
    FROM sales AS s
    WHERE s.status = 'active'
);
```

En términos de teoría de conjuntos:

**C - S**

La consulta principal representa el conjunto de clientes registrados, mientras que la subconsulta obtiene los clientes que tienen ventas activas. `NOT IN` permite excluir estos últimos.

**Evidencia:**

![alt text](image-7.png)

---

### Clientes con ventas superiores al promedio

También se puede utilizar una subconsulta para obtener los clientes que poseen al menos una venta cuyo valor supera el promedio general de las ventas:

```sql
SELECT DISTINCT
    c.id,
    c.name,
    c.email
FROM customers AS c
JOIN sales AS s
    ON c.id = s.customer_id
WHERE s.total > (
    SELECT AVG(total)
    FROM sales
);
```

Esta consulta combina una relación entre conjuntos mediante `JOIN` con una subconsulta de agregación.

**Evidencia:**

![alt text](image-8.png)

---

## 20. AUDITORÍA DE TABLAS MEDIANTE TRIGGERS

### Situación hipotética

MovilCare maneja información de clientes y ventas que puede ser modificada durante la operación diaria de la empresa.

La tabla `customers` fue seleccionada para auditoría porque contiene información de contacto e identificación de los clientes. Una modificación o eliminación accidental podría dificultar el seguimiento de las operaciones comerciales.

La tabla `sales` también fue seleccionada porque contiene información relacionada con las operaciones de venta. Los cambios en sus valores pueden afectar los registros financieros y los reportes posteriores.

Por este motivo se implementó una tabla de auditoría para cada una de estas tablas y se crearon triggers que registran automáticamente las operaciones de `INSERT`, `UPDATE` y `DELETE`.

---

### 20.1 Auditoría de customers

#### Tabla de auditoría

Se creó una tabla paralela para almacenar los cambios realizados sobre `customers`.

```sql
CREATE TABLE customers_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    action_type ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(255) NOT NULL DEFAULT 'unknown',
    before_data JSON NULL,
    after_data JSON NULL
);
```

**Evidencia**
![alt text](image-9.png)

Los campos `before_data` y `after_data` permiten almacenar el estado anterior y posterior del registro utilizando información en formato JSON.

#### Trigger para INSERT

```sql
DELIMITER $$

CREATE TRIGGER ai_customers_audit
AFTER INSERT ON customers
FOR EACH ROW
BEGIN

    INSERT INTO customers_audit (
        customer_id,
        action_type,
        before_data,
        after_data
    )
    VALUES (
        NEW.id,
        'INSERT',
        NULL,
        JSON_OBJECT(
            'id', NEW.id,
            'name', NEW.name,
            'document_type', NEW.document_type,
            'document_number', NEW.document_number,
            'phone', NEW.phone,
            'email', NEW.email,
            'status', NEW.status
        )
    );

END $$

DELIMITER ;
```
**Evidencia**
![alt text](image-13.png)
![alt text](image-14.png)

#### Trigger para UPDATE

```sql
DELIMITER $$

CREATE TRIGGER au_customers_audit
AFTER UPDATE ON customers
FOR EACH ROW
BEGIN

    INSERT INTO customers_audit (
        customer_id,
        action_type,
        before_data,
        after_data
    )
    VALUES (
        NEW.id,
        'UPDATE',
        JSON_OBJECT(
            'id', OLD.id,
            'name', OLD.name,
            'document_type', OLD.document_type,
            'document_number', OLD.document_number,
            'phone', OLD.phone,
            'email', OLD.email,
            'status', OLD.status
        ),
        JSON_OBJECT(
            'id', NEW.id,
            'name', NEW.name,
            'document_type', NEW.document_type,
            'document_number', NEW.document_number,
            'phone', NEW.phone,
            'email', NEW.email,
            'status', NEW.status
        )
    );

END $$

DELIMITER ;
```
**Evidencia**
![alt text](image-15.png)
![alt text](image-16.png)

#### Trigger para DELETE

```sql
DELIMITER $$

CREATE TRIGGER ad_customers_audit
AFTER DELETE ON customers
FOR EACH ROW
BEGIN

    INSERT INTO customers_audit (
        customer_id,
        action_type,
        before_data,
        after_data
    )
    VALUES (
        OLD.id,
        'DELETE',
        JSON_OBJECT(
            'id', OLD.id,
            'name', OLD.name,
            'document_type', OLD.document_type,
            'document_number', OLD.document_number,
            'phone', OLD.phone,
            'email', OLD.email,
            'status', OLD.status
        ),
        NULL
    );

END $$

DELIMITER ;
```

**Evidencia**
![alt text](image-17.png)
![alt text](image-18.png)

#### Creación mediante DBeaver

Los triggers fueron creados mediante la interfaz de DBeaver.

Desde el navegador de la base de datos se seleccionó:

**Base de datos → Schemas → Tables → customers → Triggers → Create New Trigger**

Se configuraron los triggers correspondientes a las operaciones `INSERT`, `UPDATE` y `DELETE`.

**Evidencia:**

![alt text](image-19.png)

#### Verificación de la auditoría

Después de realizar una modificación sobre un cliente:

```sql
UPDATE customers
SET phone = '3009999999'
WHERE id = 1;
```

**Evidencias**
![alt text](image-20.png)

Se consultó la tabla de auditoría:

```sql
SELECT *
FROM customers_audit
ORDER BY changed_at DESC;
```

**Evidencia:**

![alt text](image-21.png)

---

### 20.2 Auditoría de sales

#### Tabla de auditoría

La tabla `sales` también se audita debido a que contiene información directamente relacionada con las operaciones comerciales de la empresa.

```sql
CREATE TABLE sales_audit (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT NOT NULL,
    action_type ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(255) NOT NULL DEFAULT 'unknown',
    before_data JSON NULL,
    after_data JSON NULL
);
```

**Evidencia**
![alt text](image-22.png)

#### Trigger para INSERT

```sql
DELIMITER $$

CREATE TRIGGER ai_sales_audit
AFTER INSERT ON sales
FOR EACH ROW
BEGIN

    INSERT INTO sales_audit (
        sale_id,
        action_type,
        before_data,
        after_data
    )
    VALUES (
        NEW.id,
        'INSERT',
        NULL,
        JSON_OBJECT(
            'id', NEW.id,
            'customer_id', NEW.customer_id,
            'date', NEW.date,
            'subtotal', NEW.subtotal,
            'taxes', NEW.taxes,
            'total', NEW.total,
            'status', NEW.status
        )
    );

END $$

DELIMITER ;
```
**Evidencias**
![alt text](image-23.png)
![alt text](image-24.png)

#### Trigger para UPDATE

```sql
DELIMITER $$

CREATE TRIGGER au_sales_audit
AFTER UPDATE ON sales
FOR EACH ROW
BEGIN

    INSERT INTO sales_audit (
        sale_id,
        action_type,
        before_data,
        after_data
    )
    VALUES (
        NEW.id,
        'UPDATE',
        JSON_OBJECT(
            'id', OLD.id,
            'customer_id', OLD.customer_id,
            'date', OLD.date,
            'subtotal', OLD.subtotal,
            'taxes', OLD.taxes,
            'total', OLD.total,
            'status', OLD.status
        ),
        JSON_OBJECT(
            'id', NEW.id,
            'customer_id', NEW.customer_id,
            'date', NEW.date,
            'subtotal', NEW.subtotal,
            'taxes', NEW.taxes,
            'total', NEW.total,
            'status', NEW.status
        )
    );

END $$

DELIMITER ;
```

**Evidencias**
![alt text](image-26.png)
![alt text](image-27.png)

#### Trigger para DELETE

```sql
DELIMITER $$

CREATE TRIGGER ad_sales_audit
AFTER DELETE ON sales
FOR EACH ROW
BEGIN

    INSERT INTO sales_audit (
        sale_id,
        action_type,
        before_data,
        after_data
    )
    VALUES (
        OLD.id,
        'DELETE',
        JSON_OBJECT(
            'id', OLD.id,
            'customer_id', OLD.customer_id,
            'date', OLD.date,
            'subtotal', OLD.subtotal,
            'taxes', OLD.taxes,
            'total', OLD.total,
            'status', OLD.status
        ),
        NULL
    );

END $$

DELIMITER ;
```

**Evidencias**
![alt text](image-28.png)
![alt text](image-29.png)

#### Creación mediante DBeaver

Los triggers fueron creados utilizando la interfaz gráfica de DBeaver, accediendo a la sección de triggers asociada a la tabla `sales`.

**Evidencia:**

![alt text](image-30.png)

#### Verificación de la auditoría

Para comprobar el funcionamiento del trigger se realizó una modificación sobre una venta:

```sql
UPDATE sales
SET total = total + 1000
WHERE id = 1;
```
**Evidencias**
![alt text](image-31.png)

Posteriormente se consultaron los registros generados en la tabla de auditoría:

```sql
SELECT *
FROM sales_audit
ORDER BY changed_at DESC;
```

**Evidencia:**
![alt text](image-32.png)


# POSTGRESQL

## Importación de los datos y las tablas

Para realizar las consultas en PostgreSQL se utilizaron las tablas creadas previamente en la base de datos. Los registros generados mediante Mockaroo fueron exportados en formato CSV y posteriormente importados a las tablas correspondientes utilizando DBeaver.

**Evidencia**
![alt text](./evidencias/mysql/image-43.png)
![alt text](./evidencias/mysql/image-44.png)
![alt text](./evidencias/mysql/image-45.png)
![alt text](./evidencias/mysql/image-46.png)
---

## 1. INSERT INTO

La sentencia `INSERT INTO` permite insertar nuevos registros en una tabla. En este caso se agrega un nuevo cliente proporcionando sus datos personales y de contacto.

**Código:**

```sql
INSERT INTO customers (
    name,
    document_type,
    document_number,
    phone,
    email
) VALUES (
    'Mauricio',
    'CC',
    '1115525693',
    '3002285588',
    'mauci@gmail.com'
);
```

**Evidencia:**

![alt text](./evidencias/mysql/image-47.png)

---

## 2. SELECT *

La sentencia `SELECT` permite consultar información almacenada en una o varias tablas.

El símbolo `*` permite seleccionar todas las columnas de la tabla. También es posible especificar únicamente las columnas que se desean consultar.

**Código:**

```sql
SELECT *
FROM customers;
```

También se pueden seleccionar columnas específicas:

```sql
SELECT name, price
FROM products;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-1.png)
![alt text](./evidencias/Postgre/image-2.png)

---

## 3. WHERE

La cláusula `WHERE` permite establecer condiciones para filtrar los registros obtenidos mediante una consulta.

Por ejemplo, se pueden consultar las ventas cuyo valor total sea inferior a $250.000:

```sql
SELECT *
FROM sales
WHERE total < 150;
```

También se pueden establecer condiciones utilizando las relaciones entre las tablas:

```sql
SELECT
    s.id,
    c.name,
    s.total
FROM sales AS s, customers AS c
WHERE s.customer_id = c.id;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-3.png)
![alt text](./evidencias/Postgre/image-4.png)

---

## 4. LIKE

El operador `LIKE` permite realizar búsquedas de texto utilizando patrones. El carácter `_` representa exactamente un carácter, mientras que `%` representa una cantidad variable de caracteres.

Debido a que la columna `name` almacena el nombre y el apellido en un mismo campo, se puede buscar un nombre que comience con `M` y tenga exactamente cinco caracteres, permitiendo que posteriormente exista un espacio y el apellido.

**Código:**

```sql
SELECT *
FROM customers
WHERE name LIKE 'M____'
   OR name LIKE 'M____ %';
```

En esta consulta, `M` representa el primer carácter y los cuatro caracteres `_` completan un nombre de cinco caracteres. La segunda condición permite que después del nombre exista un espacio seguido del apellido.

**Evidencia:**

![alt text](./evidencias/Postgre/image-5.png)

---

## 5. JOIN

La cláusula `JOIN` permite combinar información de diferentes tablas mediante las relaciones existentes entre ellas.

Por ejemplo, se pueden relacionar los clientes con las ventas mediante `customer_id`:

```sql
SELECT
    c.name,
    s.id AS sale_id,
    s.date,
    s.total
FROM customers AS c
JOIN sales AS s
    ON c.id = s.customer_id;
```

También se pueden relacionar las ventas con sus respectivos detalles y productos:

```sql
SELECT
    s.id AS sale_id,
    p.name AS product,
    sd.quantity,
    sd.unit_price,
    sd.total
FROM sales AS s
JOIN sale_details AS sd
    ON s.id = sd.sale_id
JOIN products AS p
    ON sd.product_id = p.id;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-6.png)
![alt text](./evidencias/Postgre/image-7.png)

---

## 6. AND

El operador `AND` permite combinar varias condiciones dentro de una consulta. Para que un registro sea seleccionado, todas las condiciones deben cumplirse.

Por ejemplo, para consultar ventas superiores a $100.000 que además se encuentren activas:

```sql
SELECT *
FROM sales
WHERE total > 100
AND status = 'active';
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-8.png)

---

## 7. AS

La palabra reservada `AS` permite establecer alias para tablas o columnas. Los alias facilitan la lectura de consultas y permiten utilizar nombres más cortos.

**Código:**

```sql
SELECT
    c.name AS customer_name,
    c.email AS customer_email
FROM customers AS c;
```

También puede utilizarse para asignar un nombre diferente a una columna calculada:

```sql
SELECT
    AVG(price) AS average_price
FROM products;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-9.png)
![alt text](./evidencias/Postgre/image-10.png)

---

## 8. ON

La cláusula `ON` establece la condición que permite relacionar las tablas utilizadas mediante `JOIN`.

En el siguiente ejemplo se relaciona el identificador del cliente con el `customer_id` almacenado en las ventas:

```sql
SELECT
    c.name,
    s.id AS sale_id,
    s.total
FROM customers AS c
JOIN sales AS s
    ON c.id = s.customer_id;
```

La condición `ON c.id = s.customer_id` indica qué columnas deben coincidir para establecer la relación entre ambas tablas.

**Evidencia:**

![alt text](./evidencias/Postgre/image-11.png)

---

## 9. ORDER BY

La cláusula `ORDER BY` permite ordenar los registros obtenidos por una consulta.

Por defecto, el orden es ascendente mediante `ASC`:

```sql
SELECT *
FROM products
ORDER BY price ASC;
```

También se puede utilizar `DESC` para ordenar de forma descendente:

```sql
SELECT *
FROM products
ORDER BY price DESC;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-12.png)

![alt text](./evidencias/Postgre/image-13.png)

---

## 10. COMPARADORES LÓGICOS

Los operadores de comparación permiten establecer condiciones para seleccionar determinados registros.

Los principales operadores son:

- `=` igual
- `<>` diferente
- `>` mayor que
- `<` menor que
- `>=` mayor o igual que
- `<=` menor o igual que

Por ejemplo:

```sql
SELECT *
FROM products
WHERE price >= 100;
```

También se pueden combinar varios operadores:

```sql
SELECT *
FROM products
WHERE price >= 50
AND price <= 200;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-14.png)
![alt text](./evidencias/Postgre/image-15.png)

---

## 11. GROUP BY

La cláusula `GROUP BY` permite agrupar registros que tienen el mismo valor en una o varias columnas. Se utiliza principalmente junto con funciones de agregación.

Por ejemplo, se puede agrupar la cantidad de ventas realizadas por cada cliente:

```sql
SELECT
    customer_id,
    COUNT(*) AS total_sales
FROM sales
GROUP BY customer_id;
```

También se puede agrupar la cantidad de unidades vendidas por producto:

```sql
SELECT
    product_id,
    SUM(quantity) AS total_quantity
FROM sale_details
GROUP BY product_id;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-16.png)
![alt text](./evidencias/Postgre/image-17.png)

---

## 12. COUNT

La función `COUNT` permite contar la cantidad de registros de una tabla o de un grupo de registros.

Para conocer la cantidad total de clientes:

```sql
SELECT COUNT(*) AS total_customers
FROM customers;
```

También puede utilizarse junto con `GROUP BY`:

```sql
SELECT
    customer_id,
    COUNT(*) AS total_sales
FROM sales
GROUP BY customer_id;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-18.png)
![alt text](./evidencias/Postgre/image-19.png)

---

## 13. SUM

La función `SUM` permite calcular la suma de los valores de una columna numérica.

Para obtener el valor total de todas las ventas:

```sql
SELECT SUM(total) AS total_sales
FROM sales;
```

También se puede calcular la cantidad total de unidades vendidas por producto:

```sql
SELECT
    product_id,
    SUM(quantity) AS total_quantity
FROM sale_details
GROUP BY product_id;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-20.png)
![alt text](./evidencias/Postgre/image-21.png)

---

## 14. AVG

La función `AVG` permite calcular el promedio de los valores almacenados en una columna numérica.

Por ejemplo, se puede calcular el precio promedio de los productos:

```sql
SELECT AVG(price) AS average_price
FROM products;
```

También se puede obtener el promedio del valor de las ventas:

```sql
SELECT AVG(total) AS average_sale
FROM sales;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-22.png)
![alt text](./evidencias/Postgre/image-23.png)

---

## 15. HAVING

La cláusula `HAVING` permite establecer condiciones sobre los grupos obtenidos mediante `GROUP BY`.

A diferencia de `WHERE`, que filtra registros individuales, `HAVING` permite filtrar los resultados de una agrupación.

Por ejemplo, para mostrar los clientes que tengan más de una venta:

```sql
SELECT
    customer_id,
    COUNT(*) AS total_sales
FROM sales
GROUP BY customer_id
HAVING COUNT(*) > 1;
```

También se puede utilizar para identificar productos cuya cantidad total vendida sea superior a 10 unidades:

```sql
SELECT
    product_id,
    SUM(quantity) AS total_quantity
FROM sale_details
GROUP BY product_id
HAVING SUM(quantity) > 10;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-24.png)
![alt text](./evidencias/Postgre/image-25.png)

---

## 16. FUNCIONES DE AGREGACIÓN

Las funciones de agregación permiten realizar operaciones sobre un conjunto de registros y obtener un resultado.

Entre las principales funciones se encuentran:

- `COUNT()` para contar registros.
- `SUM()` para sumar valores.
- `AVG()` para calcular promedios.
- `MIN()` para obtener el valor mínimo.
- `MAX()` para obtener el valor máximo.

**Código:**

```sql
SELECT
    COUNT(*) AS total_products,
    AVG(price) AS average_price,
    MIN(price) AS minimum_price,
    MAX(price) AS maximum_price
FROM products;
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-26.png)

---

## 17. SUBCONSULTAS

Las subconsultas son consultas que se encuentran dentro de otra consulta. El resultado de la consulta interna puede utilizarse como condición para la consulta principal.

Por ejemplo, se pueden consultar los productos cuyo precio sea superior al precio promedio de todos los productos:

```sql
SELECT
    name,
    price
FROM products
WHERE price > (
    SELECT AVG(price)
    FROM products
);
```

También se pueden consultar los clientes que hayan realizado al menos una venta:

```sql
SELECT
    name,
    document_number
FROM customers
WHERE id IN (
    SELECT customer_id
    FROM sales
);
```

**Evidencia:**

![alt text](./evidencias/Postgre/image-27.png)
![alt text](./evidencias/Postgre/image-28.png)

## 18. CONSULTA AVANZADA COMBINADA

### Situación hipotética

La empresa MovilCare necesita generar un reporte para el área comercial que permita identificar los productos que presentan un movimiento significativo dentro de las ventas.

El reporte debe mostrar el nombre del producto, la cantidad de registros de venta en los que aparece y la cantidad total de unidades vendidas. Solamente se consideran los detalles de venta activos y los productos cuyo precio sea superior al precio promedio de todos los productos.

Además, se requieren únicamente los productos que hayan aparecido en al menos dos registros de venta y que hayan acumulado como mínimo 50 unidades vendidas.

Esta consulta combina `JOIN`, `ON`, `WHERE`, `AND`, `AS`, `GROUP BY`, `COUNT`, `SUM`, `AVG`, `HAVING`, `ORDER BY` y una subconsulta.

### Consulta

```sql
SELECT
    p.name AS product_name,
    COUNT(sd.id) AS number_of_sales,
    SUM(sd.quantity) AS total_quantity_sold
FROM products AS p
JOIN sale_details AS sd
    ON p.id = sd.product_id
WHERE sd.status = 'active'
AND p.price > (
    SELECT AVG(price)
    FROM products
)
GROUP BY p.id, p.name
HAVING COUNT(sd.id) >= 2
AND SUM(sd.quantity) >= 50
ORDER BY total_quantity_sold ASC;
```

**Evidencia**
![alt text](image-33.png)

### Explicación

La consulta relaciona `products` y `sale_details` mediante `JOIN` y `ON`.

`WHERE` filtra los detalles de venta activos y los productos cuyo precio supera el promedio general. El promedio se obtiene mediante una subconsulta utilizando `AVG()`.

Posteriormente, `GROUP BY` agrupa los registros por producto. `COUNT()` determina la cantidad de registros de venta y `SUM()` calcula las unidades vendidas.

Finalmente, `HAVING` filtra los grupos que cumplen los valores mínimos establecidos y `ORDER BY` ordena los resultados de acuerdo con la cantidad total vendida.

### Creación del procedimiento

En PostgreSQL se puede utilizar un procedimiento almacenado mediante `CREATE PROCEDURE` y posteriormente ejecutarlo mediante `CALL`. :contentReference[oaicite:1]{index=1}

```sql
CREATE OR REPLACE PROCEDURE public.sp_product_sales_report(
    IN p_min_sales INTEGER,
    IN p_min_quantity NUMERIC(15,3),
    INOUT p_result REFCURSOR
)
LANGUAGE plpgsql
AS $procedure$
BEGIN

    OPEN p_result FOR
        SELECT
            p.name AS product_name,
            COUNT(sd.id) AS number_of_sales,
            SUM(sd.quantity) AS total_quantity_sold
        FROM products AS p
        JOIN sale_details AS sd
            ON p.id = sd.product_id
        WHERE sd.status = 'active'
          AND p.price > (
              SELECT AVG(price)
              FROM products
          )
        GROUP BY p.id, p.name
        HAVING COUNT(sd.id) >= p_min_sales
           AND SUM(sd.quantity) >= p_min_quantity
        ORDER BY total_quantity_sold ASC;

END;
$procedure$;
```

### Creación mediante DBeaver

Para crear el procedimiento mediante la interfaz de DBeaver se accedió al navegador de PostgreSQL y se seleccionó:

**Base de datos → Schemas → public → Functions → Create New Procedure**

Se estableció el nombre:

`sp_product_sales_report`

Y se agregaron los parámetros:

| Parámetro | Tipo | Dirección |
|---|---|---|
| `p_min_sales` | `INTEGER` | IN |
| `p_min_quantity` | `NUMERIC(15,3)` | IN |

Posteriormente se configuró el cuerpo del procedimiento y se ejecutó la opción de creación.

**Evidencia:**

![alt text](image-34.png)

### Llamada al procedimiento

El procedimiento se ejecutó utilizando dos ventas como cantidad mínima y 50 unidades como cantidad mínima vendida:

```sql
BEGIN;

CALL public.sp_product_sales_report(
    2,
    50,
    'product_sales_cursor'
);

FETCH ALL FROM product_sales_cursor;

COMMIT;
```

**Evidencia:**

![alt text](image-35.png)

---

## 19. TEORÍA DE CONJUNTOS MEDIANTE SUBCONSULTAS

### Situación hipotética

El área comercial de MovilCare necesita analizar la relación entre los clientes registrados y aquellos que han realizado ventas.

Se consideran dos conjuntos:

- **Conjunto C:** clientes registrados.
- **Conjunto S:** clientes que aparecen en las ventas.

### Intersección entre clientes y clientes con ventas

```sql
SELECT *
FROM customers AS c
WHERE c.id IN (
    SELECT s.customer_id
    FROM sales AS s
);
```

La consulta representa la intersección:

**C ∩ S**

Se obtienen los clientes que pertenecen al conjunto de clientes registrados y que también aparecen en el conjunto de clientes con ventas.

**Evidencia:**

![alt text](image-36.png)

---

### Diferencia entre clientes y clientes con ventas activas

Para identificar clientes registrados que no tienen ventas activas:

```sql
SELECT *
FROM customers AS c
WHERE c.id NOT IN (
    SELECT s.customer_id
    FROM sales AS s
    WHERE s.status = 'active'
);
```

Esta consulta representa:

**C - S**

La subconsulta obtiene los clientes con ventas activas y `NOT IN` permite excluirlos del conjunto general de clientes.

**Evidencia:**

![alt text](image-37.png)

---

### Clientes con ventas superiores al promedio

También se pueden identificar los clientes que realizaron ventas cuyo valor supera el promedio general:

```sql
SELECT DISTINCT
    c.id,
    c.name,
    c.email
FROM customers AS c
JOIN sales AS s
    ON c.id = s.customer_id
WHERE s.total > (
    SELECT AVG(total)
    FROM sales
);
```

**Evidencia:**

![alt text](image-38.png)

---

## 20. AUDITORÍA DE TABLAS MEDIANTE TRIGGERS

### Situación hipotética

La tabla `customers` fue seleccionada para auditoría porque contiene información de identificación y contacto de los clientes. Estos datos pueden ser modificados durante la operación normal de la empresa y es necesario conservar un registro de los cambios.

La tabla `sales` fue seleccionada porque contiene información relacionada con las operaciones comerciales. Los cambios realizados sobre sus valores pueden afectar reportes financieros y procesos posteriores.

Por este motivo se implementaron mecanismos de auditoría para registrar las operaciones `INSERT`, `UPDATE` y `DELETE`.

---

### 20.1 Auditoría de customers

#### Tabla de auditoría

```sql
CREATE TABLE customers_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    action_type VARCHAR(10) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(255) NOT NULL DEFAULT 'unknown',
    before_data JSONB NULL,
    after_data JSONB NULL,

    CONSTRAINT chk_customers_audit_action
        CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE'))
);
```

**Evidencias**
![alt text](image-39.png)

#### Función para auditoría

En PostgreSQL los triggers utilizan una función que retorna `TRIGGER`.

```sql
CREATE OR REPLACE FUNCTION fn_customers_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN

        INSERT INTO customers_audit (
            customer_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            NEW.id,
            'INSERT',
            NULL,
            to_jsonb(NEW)
        );

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN

        INSERT INTO customers_audit (
            customer_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW)
        );

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        INSERT INTO customers_audit (
            customer_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            NULL
        );

        RETURN OLD;

    END IF;

END;
$$;
```

**Evidencia**
![alt text](image-40.png)

#### Creación del trigger

```sql
CREATE TRIGGER trg_customers_audit
AFTER INSERT OR UPDATE OR DELETE
ON customers
FOR EACH ROW
EXECUTE FUNCTION fn_customers_audit();
```

#### Creación mediante DBeaver

La función y el trigger fueron creados mediante la interfaz de DBeaver, utilizando las opciones correspondientes dentro del esquema `public`.

**Evidencia:**

![alt text](image-41.png)

#### Verificación

Se realizó una modificación sobre un cliente:

```sql
UPDATE customers
SET phone = '3009999999'
WHERE id = 1;
```

**Evidencias**
![alt text](image-42.png)

Posteriormente se consultó la tabla de auditoría:

```sql
SELECT *
FROM customers_audit
ORDER BY changed_at DESC;
```

**Evidencia:**

![alt text](image-43.png)

---

### 20.2 Auditoría de sales

#### Tabla de auditoría

```sql
CREATE TABLE sales_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id BIGINT NOT NULL,
    action_type VARCHAR(10) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(255) NOT NULL DEFAULT 'unknown',
    before_data JSONB NULL,
    after_data JSONB NULL,

    CONSTRAINT chk_sales_audit_action
        CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE'))
);
```

**Evidencia**
![alt text](image-44.png)

#### Función para auditoría

```sql
CREATE OR REPLACE FUNCTION fn_sales_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN

        INSERT INTO sales_audit (
            sale_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            NEW.id,
            'INSERT',
            NULL,
            to_jsonb(NEW)
        );

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN

        INSERT INTO sales_audit (
            sale_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            NEW.id,
            'UPDATE',
            to_jsonb(OLD),
            to_jsonb(NEW)
        );

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN

        INSERT INTO sales_audit (
            sale_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            OLD.id,
            'DELETE',
            to_jsonb(OLD),
            NULL
        );

        RETURN OLD;

    END IF;

END;
$$;
```

**Evidencia**
![alt text](image-45.png)
![alt text](image-46.png)

#### Creación del trigger

```sql
CREATE TRIGGER trg_sales_audit
AFTER INSERT OR UPDATE OR DELETE
ON sales
FOR EACH ROW
EXECUTE FUNCTION fn_sales_audit();
```

**Evidencia**
![alt text](image-47.png)

#### Creación mediante DBeaver

El trigger se creó mediante la interfaz gráfica de DBeaver, asociado a la tabla `sales`.

**Evidencia:**

![alt text](image-48.png)

#### Verificación

Para comprobar el funcionamiento de la auditoría se modificó una venta:

```sql
UPDATE sales
SET total = total + 1000
WHERE id = 1;
```
**Evidencia**
![alt text](image-49.png)

Posteriormente se consultaron los registros generados:

```sql
SELECT *
FROM sales_audit
ORDER BY changed_at DESC;
```

**Evidencia:**
![alt text](image-50.png)

# MS SQL SERVER

## Importación de los datos y las tablas

Para realizar las consultas en Microsoft SQL Server se utilizaron las tablas creadas previamente en la base de datos. Los registros generados mediante Mockaroo fueron exportados en formato CSV y posteriormente importados a las tablas correspondientes utilizando SQL Server Management Studio (SSMS).

![alt text](./evidencias/mssql/image-1.png)
![alt text](./evidencias/mssql/image-2.png)
![alt text](./evidencias/mssql/image-3.png)
![alt text](./evidencias/mssql/image-4.png)
---

## 1. INSERT INTO

La sentencia `INSERT INTO` permite insertar nuevos registros en una tabla. En este caso se agrega un nuevo cliente proporcionando sus datos personales y de contacto.

**Código:**

```sql
INSERT INTO customers (
    name,
    document_type,
    document_number,
    phone,
    email
) VALUES (
    'Mauricio',
    'CC',
    '1115525693',
    '3002285588',
    'mauci@gmail.com'
);
```

**Evidencia:**

![alt text](./evidencias/mssql/image-5.png)

---

## 2. SELECT *

La sentencia `SELECT` permite consultar información almacenada en una o varias tablas.

El símbolo `*` permite seleccionar todas las columnas de una tabla. También es posible especificar únicamente las columnas que se desean consultar.

**Código:**

```sql
SELECT *
FROM customers;
```

También se pueden seleccionar columnas específicas:

```sql
SELECT name, price
FROM products;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-6.png)
![alt text](./evidencias/mssql/image-7.png)

---

## 3. WHERE

La cláusula `WHERE` permite establecer condiciones para filtrar los registros obtenidos mediante una consulta.

Por ejemplo, se pueden consultar las ventas cuyo valor total sea inferior a $150:

```sql
SELECT *
FROM sales
WHERE total < 150;
```

También se pueden establecer condiciones utilizando las relaciones entre las tablas:

```sql
SELECT
    s.id,
    c.name,
    s.total
FROM sales AS s
JOIN customers AS c
    ON s.customer_id = c.id;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-8.png)
![alt text](./evidencias/mssql/image-9.png)

---

## 4. LIKE

El operador `LIKE` permite realizar búsquedas de texto utilizando patrones. El carácter `_` representa exactamente un carácter, mientras que `%` representa una cantidad variable de caracteres.

Debido a que la columna `name` almacena el nombre y el apellido en un mismo campo, se puede buscar un nombre que comience con `M` y tenga exactamente cinco caracteres, permitiendo que posteriormente exista un espacio y el apellido.

**Código:**

```sql
SELECT *
FROM customers
WHERE name LIKE 'M____'
   OR name LIKE 'M____ %';
```

En esta consulta, `M` representa el primer carácter y los cuatro caracteres `_` completan un nombre de cinco caracteres. La segunda condición permite que después del nombre exista un espacio seguido del apellido.

**Evidencia:**

![alt text](./evidencias/mssql/image-10.png)

---

## 5. JOIN

La cláusula `JOIN` permite combinar información de diferentes tablas mediante las relaciones existentes entre ellas.

Por ejemplo, se pueden relacionar los clientes con las ventas mediante `customer_id`:

```sql
SELECT
    c.name,
    s.id AS sale_id,
    s.date,
    s.total
FROM customers AS c
JOIN sales AS s
    ON c.id = s.customer_id;
```

También se pueden relacionar las ventas con sus respectivos detalles y productos:

```sql
SELECT
    s.id AS sale_id,
    p.name AS product,
    sd.quantity,
    sd.unit_price,
    sd.total
FROM sales AS s
JOIN sale_details AS sd
    ON s.id = sd.sale_id
JOIN products AS p
    ON sd.product_id = p.id;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-11.png)
![alt text](./evidencias/mssql/image-12.png)

---

## 6. AND

El operador `AND` permite combinar varias condiciones dentro de una consulta. Para que un registro sea seleccionado, todas las condiciones deben cumplirse.

Por ejemplo, para consultar ventas superiores a $100.000 que además se encuentren activas:

```sql
SELECT *
FROM sales
WHERE total > 100
  AND status = 'active';
```

**Evidencia:**

![alt text](./evidencias/mssql/image-13.png)

---

## 7. AS

La palabra reservada `AS` permite establecer alias para tablas o columnas. Los alias facilitan la lectura de las consultas y permiten utilizar nombres más cortos.

**Código:**

```sql
SELECT
    c.name AS customer_name,
    c.email AS customer_email
FROM customers AS c;
```

También puede utilizarse para asignar un nombre diferente a una columna calculada:

```sql
SELECT
    AVG(price) AS average_price
FROM products;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-14.png)
![alt text](./evidencias/mssql/image-15.png)

---

## 8. ON

La cláusula `ON` establece la condición que permite relacionar las tablas utilizadas mediante `JOIN`.

En el siguiente ejemplo se relaciona el identificador del cliente con el `customer_id` almacenado en las ventas:

```sql
SELECT
    c.name,
    s.id AS sale_id,
    s.total
FROM customers AS c
JOIN sales AS s
    ON c.id = s.customer_id;
```

La condición `ON c.id = s.customer_id` indica qué columnas deben coincidir para establecer la relación entre ambas tablas.

**Evidencia:**

![alt text](./evidencias/mssql/image-16.png)

---

## 9. ORDER BY

La cláusula `ORDER BY` permite ordenar los registros obtenidos por una consulta.

Por defecto, el orden es ascendente mediante `ASC`:

```sql
SELECT *
FROM products
ORDER BY price ASC;
```

También se puede utilizar `DESC` para ordenar de forma descendente:

```sql
SELECT *
FROM products
ORDER BY price DESC;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-17.png)
![alt text](./evidencias/mssql/image-18.png)

---

## 10. COMPARADORES LÓGICOS

Los operadores de comparación permiten establecer condiciones para seleccionar determinados registros.

Los principales operadores son:

* `=` igual
* `<>` diferente
* `>` mayor que
* `<` menor que
* `>=` mayor o igual que
* `<=` menor o igual que

Por ejemplo:

```sql
SELECT *
FROM products
WHERE price >= 100;
```

También se pueden combinar varios operadores:

```sql
SELECT *
FROM products
WHERE price >= 50
  AND price <= 200;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-19.png)
![alt text](./evidencias/mssql/image-20.png)

---

## 11. GROUP BY

La cláusula `GROUP BY` permite agrupar registros que tienen el mismo valor en una o varias columnas. Se utiliza principalmente junto con funciones de agregación.

Por ejemplo, se puede agrupar la cantidad de ventas realizadas por cada cliente:

```sql
SELECT
    customer_id,
    COUNT(*) AS total_sales
FROM sales
GROUP BY customer_id;
```

También se puede agrupar la cantidad de unidades vendidas por producto:

```sql
SELECT
    product_id,
    SUM(quantity) AS total_quantity
FROM sale_details
GROUP BY product_id;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-21.png)
![alt text](./evidencias/mssql/image-22.png)

---

## 12. COUNT

La función `COUNT` permite contar la cantidad de registros de una tabla o de un grupo de registros.

Para conocer la cantidad total de clientes:

```sql
SELECT COUNT(*) AS total_customers
FROM customers;
```

También puede utilizarse junto con `GROUP BY`:

```sql
SELECT
    customer_id,
    COUNT(*) AS total_sales
FROM sales
GROUP BY customer_id;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-23.png)
![alt text](./evidencias/mssql/image-24.png)

---

## 13. SUM

La función `SUM` permite calcular la suma de los valores de una columna numérica.

Para obtener el valor total de todas las ventas:

```sql
SELECT SUM(total) AS total_sales
FROM sales;
```

También se puede calcular la cantidad total de unidades vendidas por producto:

```sql
SELECT
    product_id,
    SUM(quantity) AS total_quantity
FROM sale_details
GROUP BY product_id;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-25.png)
![alt text](./evidencias/mssql/image-26.png)

---

## 14. AVG

La función `AVG` permite calcular el promedio de los valores almacenados en una columna numérica.

Por ejemplo, se puede calcular el precio promedio de los productos:

```sql
SELECT AVG(price) AS average_price
FROM products;
```

También se puede obtener el promedio del valor de las ventas:

```sql
SELECT AVG(total) AS average_sale
FROM sales;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-27.png)
![alt text](./evidencias/mssql/image-28.png)

---

## 15. HAVING

La cláusula `HAVING` permite establecer condiciones sobre los grupos obtenidos mediante `GROUP BY`.

A diferencia de `WHERE`, que filtra registros individuales, `HAVING` permite filtrar los resultados de una agrupación.

Por ejemplo, para mostrar los clientes que tengan más de una venta:

```sql
SELECT
    customer_id,
    COUNT(*) AS total_sales
FROM sales
GROUP BY customer_id
HAVING COUNT(*) > 1;
```

También se puede utilizar para identificar productos cuya cantidad total vendida sea superior a 10 unidades:

```sql
SELECT
    product_id,
    SUM(quantity) AS total_quantity
FROM sale_details
GROUP BY product_id
HAVING SUM(quantity) > 10;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-29.png)
![alt text](./evidencias/mssql/image-30.png)

---

## 16. FUNCIONES DE AGREGACIÓN

Las funciones de agregación permiten realizar operaciones sobre un conjunto de registros y obtener un resultado.

Entre las principales funciones se encuentran:

* `COUNT()` para contar registros.
* `SUM()` para sumar valores.
* `AVG()` para calcular promedios.
* `MIN()` para obtener el valor mínimo.
* `MAX()` para obtener el valor máximo.

**Código:**

```sql
SELECT
    COUNT(*) AS total_products,
    AVG(price) AS average_price,
    MIN(price) AS minimum_price,
    MAX(price) AS maximum_price
FROM products;
```

**Evidencia:**

![alt text](./evidencias/mssql/image-31.png)

---

## 17. SUBCONSULTAS

Las subconsultas son consultas que se encuentran dentro de otra consulta. El resultado de la consulta interna puede utilizarse como condición para la consulta principal.

Por ejemplo, se pueden consultar los productos cuyo precio sea superior al precio promedio de todos los productos:

```sql
SELECT
    name,
    price
FROM products
WHERE price > (
    SELECT AVG(price)
    FROM products
);
```

También se pueden consultar los clientes que hayan realizado al menos una venta:

```sql
SELECT
    name,
    document_number
FROM customers
WHERE id IN (
    SELECT customer_id
    FROM sales
);
```

**Evidencia:**

![alt text](./evidencias/mssql/image-32.png)
![alt text](./evidencias/mssql/image-33.png)

---

# CONSULTAS AVANZADAS COMBINADAS

## 18. CONSULTA AVANZADA COMBINADA

### Situación hipotética

La empresa MovilCare necesita generar un reporte para el área comercial que permita identificar los productos que presentan un movimiento significativo dentro de las ventas.

El reporte debe mostrar el nombre del producto, la cantidad de registros de venta en los que aparece y la cantidad total de unidades vendidas. Solamente se consideran los detalles de venta activos y los productos cuyo precio sea superior al precio promedio de todos los productos.

Además, se requieren únicamente los productos que hayan aparecido en al menos dos registros de venta y que hayan acumulado como mínimo 50 unidades vendidas.

Esta consulta combina diferentes conceptos estudiados anteriormente: `JOIN`, `ON`, `WHERE`, `AND`, `AS`, `GROUP BY`, `COUNT`, `SUM`, `AVG`, `HAVING`, `ORDER BY` y una subconsulta.

### Consulta

```sql
SELECT
    p.name AS product_name,
    COUNT(sd.id) AS number_of_sales,
    SUM(sd.quantity) AS total_quantity_sold
FROM products AS p
JOIN sale_details AS sd
    ON p.id = sd.product_id
WHERE sd.status = 'active'
AND p.price > (
    SELECT AVG(price)
    FROM products
)
GROUP BY p.id, p.name
HAVING COUNT(sd.id) >= 2
AND SUM(sd.quantity) >= 50
ORDER BY total_quantity_sold ASC;
```

**Evidencia**
![alt text](image-51.png)

### Explicación

La consulta relaciona las tablas `products` y `sale_details` mediante `JOIN` y `ON`.

La cláusula `WHERE` filtra los detalles de venta que se encuentran activos y los productos cuyo precio sea superior al precio promedio de todos los productos.

La subconsulta utiliza `AVG()` para obtener dicho promedio.

Posteriormente, `GROUP BY` agrupa los registros por producto. Las funciones `COUNT()` y `SUM()` permiten obtener la cantidad de registros de venta y las unidades vendidas respectivamente.

Finalmente, `HAVING` filtra los grupos que cumplen los valores mínimos establecidos y `ORDER BY` organiza los resultados según la cantidad total vendida.

### Creación del procedimiento

La consulta anterior se convirtió en un procedimiento almacenado para poder reutilizarla y modificar sus parámetros sin tener que escribir nuevamente toda la consulta.

```sql
CREATE OR ALTER PROCEDURE sp_product_sales_report
    @min_sales INT,
    @min_quantity DECIMAL(15,3)
AS
BEGIN

    SET NOCOUNT ON;

    SELECT
        p.name AS product_name,
        COUNT(sd.id) AS number_of_sales,
        SUM(sd.quantity) AS total_quantity_sold
    FROM products AS p
    JOIN sale_details AS sd
        ON p.id = sd.product_id
    WHERE sd.status = 'active'
    AND p.price > (
        SELECT AVG(price)
        FROM products
    )
    GROUP BY p.id, p.name
    HAVING COUNT(sd.id) >= @min_sales
    AND SUM(sd.quantity) >= @min_quantity
    ORDER BY total_quantity_sold ASC;

END;
```
**Evidencia**
![alt text](image-52.png)

Los parámetros permiten definir el número mínimo de ventas y la cantidad mínima de unidades vendidas.

### Creación mediante DBeaver

Para crear el procedimiento se utilizó la interfaz gráfica de DBeaver.

Desde el navegador de la base de datos se accedió a:

**Base de datos → Schemas → dbo → Procedures → Create New Procedure**

Se estableció el nombre:

`sp_product_sales_report`

Y se definieron los parámetros:

| Parámetro | Tipo | Dirección |
|---|---|---|
| `@min_sales` | `INT` | IN |
| `@min_quantity` | `DECIMAL(15,3)` | IN |

Posteriormente se ingresó el cuerpo del procedimiento y se ejecutó la opción correspondiente para crear el procedimiento.

**Evidencia:**

![alt text](image-53.png)

### Llamada al procedimiento

El procedimiento se ejecutó utilizando como parámetros mínimos dos ventas y 50 unidades:

```sql
EXEC sp_product_sales_report
    @min_sales = 2,
    @min_quantity = 50;
```

**Evidencia:**
![alt text](image-54.png)

---

# APLICACIÓN DE TEORÍA DE CONJUNTOS MEDIANTE SUBCONSULTAS

## 19. TEORÍA DE CONJUNTOS

### Situación hipotética

El área comercial de MovilCare necesita analizar la relación entre los clientes registrados y los clientes que han realizado ventas.

Se consideran dos conjuntos:

- **Conjunto C:** clientes registrados.
- **Conjunto S:** clientes que aparecen en las ventas.

A partir de estos conjuntos se pueden obtener diferentes operaciones mediante subconsultas.

### Intersección entre clientes y clientes con ventas

Se desea identificar los clientes que están registrados y que además han realizado al menos una venta.

```sql
SELECT *
FROM customers AS c
WHERE c.id IN (
    SELECT s.customer_id
    FROM sales AS s
);
```

Esta consulta representa:

**C ∩ S**

La consulta interna obtiene los identificadores de los clientes que aparecen en `sales`. La consulta externa devuelve los clientes cuyo identificador pertenece a ese conjunto.

**Evidencia:**
![alt text](image-55.png)


---

### Diferencia entre clientes y clientes con ventas activas

El área comercial también puede necesitar identificar los clientes registrados que no tienen ninguna venta activa.

```sql
SELECT *
FROM customers AS c
WHERE c.id NOT IN (
    SELECT s.customer_id
    FROM sales AS s
    WHERE s.status = 'active'
);
```

Esta consulta representa:

**C - S**

La subconsulta obtiene los clientes que tienen ventas activas y `NOT IN` permite excluirlos del conjunto general de clientes.

**Evidencia:**

![alt text](image-56.png)

---

### Clientes con ventas superiores al promedio

También se puede identificar a los clientes que realizaron ventas cuyo valor supera el promedio general de las ventas:

```sql
SELECT DISTINCT
    c.id,
    c.name,
    c.email
FROM customers AS c
JOIN sales AS s
    ON c.id = s.customer_id
WHERE s.total > (
    SELECT AVG(total)
    FROM sales
);
```

**Evidencia:**

![alt text](image-57.png)

---

# TRIGGERS PARA AUDITORÍA

## 20. AUDITORÍA DE TABLAS MEDIANTE TRIGGERS

### Situación hipotética

La tabla `customers` fue seleccionada para auditoría porque contiene información de identificación y contacto de los clientes. Estos datos pueden ser modificados durante la operación normal de la empresa y es necesario conservar un registro de los cambios realizados.

La tabla `sales` también fue seleccionada porque contiene información relacionada con las operaciones comerciales. Las modificaciones realizadas sobre sus valores pueden afectar reportes y procesos posteriores.

Por este motivo se implementaron mecanismos de auditoría para registrar las operaciones `INSERT`, `UPDATE` y `DELETE`.

---

## 20.1 Auditoría de customers

### Tabla de auditoría

En SQL Server se creó una tabla independiente para almacenar los cambios realizados sobre los clientes.

```sql
CREATE TABLE customers_audit (
    id INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT NOT NULL,
    action_type CHAR(6) NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT GETDATE(),
    changed_by CHAR(255) NOT NULL DEFAULT 'unknown',
    before_data VARCHAR(MAX) NULL,
    after_data VARCHAR(MAX) NULL,

    CONSTRAINT chk_customers_audit_action
        CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE'))
);
```

**Evidencia**
![alt text](image-58.png)

Los campos `before_data` y `after_data` almacenan la información anterior y posterior al cambio.

En SQL Server se utiliza `VARCHAR(MAX)` para almacenar la información en formato de texto JSON.

### Trigger de auditoría

SQL Server permite utilizar las tablas virtuales `inserted` y `deleted` dentro de los triggers.

```sql
CREATE OR ALTER TRIGGER trg_customers_audit
ON customers
AFTER INSERT, UPDATE, DELETE
AS
BEGIN

    SET NOCOUNT ON;

    -- INSERT
    INSERT INTO customers_audit (
        customer_id,
        action_type,
        before_data,
        after_data
    )
    SELECT
        i.id,
        'INSERT',
        NULL,
        (
            SELECT
                i.id,
                i.name,
                i.document_type,
                i.document_number,
                i.phone,
                i.email,
                i.status
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        )
    FROM inserted AS i
    LEFT JOIN deleted AS d
        ON i.id = d.id
    WHERE d.id IS NULL;

    -- UPDATE
    INSERT INTO customers_audit (
        customer_id,
        action_type,
        before_data,
        after_data
    )
    SELECT
        i.id,
        'UPDATE',
        (
            SELECT
                d.id,
                d.name,
                d.document_type,
                d.document_number,
                d.phone,
                d.email,
                d.status
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ),
        (
            SELECT
                i.id,
                i.name,
                i.document_type,
                i.document_number,
                i.phone,
                i.email,
                i.status
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        )
    FROM inserted AS i
    INNER JOIN deleted AS d
        ON i.id = d.id;

    -- DELETE
    INSERT INTO customers_audit (
        customer_id,
        action_type,
        before_data,
        after_data
    )
    SELECT
        d.id,
        'DELETE',
        (
            SELECT
                d.id,
                d.name,
                d.document_type,
                d.document_number,
                d.phone,
                d.email,
                d.status
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ),
        NULL
    FROM deleted AS d
    LEFT JOIN inserted AS i
        ON d.id = i.id
    WHERE i.id IS NULL;

END;
```

**Evidencia**
![alt text](image-59.png)

### Creación mediante DBeaver

El trigger fue creado utilizando la interfaz gráfica de DBeaver.

Desde el navegador de la base de datos se seleccionó:

**Base de datos → Tables → customers → Triggers → Create New Trigger**

Se configuró el trigger para ejecutarse después de las operaciones `INSERT`, `UPDATE` y `DELETE`.

**Evidencia:**

![alt text](image-60.png)

### Verificación de la auditoría

Para comprobar el funcionamiento del trigger se realizó una modificación sobre un cliente:

```sql
UPDATE customers
SET phone = '3009999999'
WHERE id = 7;
```

**Evidencia**
![alt text](image-61.png)

Posteriormente se consultó la tabla de auditoría:

```sql
SELECT *
FROM customers_audit
ORDER BY changed_at DESC;
```

**Evidencia:**
![alt text](image-62.png)

---

## 20.2 Auditoría de sales

### Tabla de auditoría

La tabla `sales` fue seleccionada debido a que contiene información relacionada con las operaciones de venta de la empresa.

```sql
CREATE TABLE sales_audit (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sale_id INT NOT NULL,
    action_type CHAR(6) NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT GETDATE(),
    changed_by CHAR(255) NOT NULL DEFAULT 'unknown',
    before_data VARCHAR(MAX) NULL,
    after_data VARCHAR(MAX) NULL,

    CONSTRAINT chk_sales_audit_action
        CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE'))
);
```

**Evidencia**
![alt text](image-63.png)

### Trigger de auditoría

```sql
CREATE OR ALTER TRIGGER trg_sales_audit
ON sales
AFTER INSERT, UPDATE, DELETE
AS
BEGIN

    SET NOCOUNT ON;

    -- INSERT
    INSERT INTO sales_audit (
        sale_id,
        action_type,
        before_data,
        after_data
    )
    SELECT
        i.id,
        'INSERT',
        NULL,
        (
            SELECT
                i.id,
                i.customer_id,
                i.date,
                i.subtotal,
                i.taxes,
                i.total,
                i.status
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        )
    FROM inserted AS i
    LEFT JOIN deleted AS d
        ON i.id = d.id
    WHERE d.id IS NULL;

    -- UPDATE
    INSERT INTO sales_audit (
        sale_id,
        action_type,
        before_data,
        after_data
    )
    SELECT
        i.id,
        'UPDATE',
        (
            SELECT
                d.id,
                d.customer_id,
                d.date,
                d.subtotal,
                d.taxes,
                d.total,
                d.status
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ),
        (
            SELECT
                i.id,
                i.customer_id,
                i.date,
                i.subtotal,
                i.taxes,
                i.total,
                i.status
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        )
    FROM inserted AS i
    INNER JOIN deleted AS d
        ON i.id = d.id;

    -- DELETE
    INSERT INTO sales_audit (
        sale_id,
        action_type,
        before_data,
        after_data
    )
    SELECT
        d.id,
        'DELETE',
        (
            SELECT
                d.id,
                d.customer_id,
                d.date,
                d.subtotal,
                d.taxes,
                d.total,
                d.status
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ),
        NULL
    FROM deleted AS d
    LEFT JOIN inserted AS i
        ON d.id = i.id
    WHERE i.id IS NULL;

END;
```

**Evidencia**
![alt text](image-64.png)

### Creación mediante DBeaver

El trigger se creó mediante la interfaz gráfica de DBeaver, asociado a la tabla `sales`.

**Evidencia:**

![alt text](image-65.png)

### Verificación de la auditoría

Se realizó una modificación sobre una venta:

```sql
UPDATE sales
SET total = total + 1000
WHERE id = 5;
```
**Evidencia**
![alt text](image-66.png)

Posteriormente se consultaron los registros generados:

```sql
SELECT *
FROM sales_audit
ORDER BY changed_at DESC;
```

**Evidencia:**
![alt text](image-67.png)

# ORACLE XE

## Importación de los datos y las tablas

Para realizar las consultas en Oracle XE se utilizaron las tablas creadas previamente en la base de datos. Los registros generados mediante Mockaroo fueron exportados en formato CSV y posteriormente importados a las tablas correspondientes utilizando DBeaver.

![alt text](./evidencias/oracle/image-1.png)
![alt text](./evidencias/oracle/image-2.png)
![alt text](./evidencias/oracle/image-3.png)
![alt text](./evidencias/oracle/image-4.png)

---

## 1. INSERT INTO

La sentencia `INSERT INTO` permite insertar nuevos registros en una tabla. En este caso se agrega un nuevo cliente proporcionando sus datos personales y de contacto.

**Código:**

```sql
INSERT INTO customers (
    name,
    document_type,
    document_number,
    phone,
    email
) VALUES (
    'Mauricio',
    'CC',
    '1115525693',
    '3002285588',
    'mauci@gmail.com'
);

COMMIT;
````

En Oracle XE se utiliza `COMMIT` para confirmar y guardar de manera permanente los cambios realizados mediante operaciones como `INSERT`, `UPDATE` o `DELETE`.

**Evidencia:**

![alt text](./evidencias/oracle/image-5.png)

---

## 2. SELECT *

La sentencia `SELECT` permite consultar información almacenada en una o varias tablas.

El símbolo `*` permite seleccionar todas las columnas de una tabla. También es posible especificar únicamente las columnas que se desean consultar.

**Código:**

```sql
SELECT *
FROM customers;
```

También se pueden seleccionar columnas específicas:

```sql
SELECT name, price
FROM products;
```

**Evidencia:**

![alt text](./evidencias/oracle/image-6.png)
![alt text](./evidencias/oracle/image-7.png)

---

## 3. WHERE

La cláusula `WHERE` permite establecer condiciones para filtrar los registros obtenidos mediante una consulta.

Por ejemplo, se pueden consultar las ventas cuyo valor total sea inferior a $150:

```sql
SELECT *
FROM sales
WHERE total < 150;
```

También se pueden establecer condiciones utilizando las relaciones entre las tablas:

```sql
SELECT
    s.id,
    c.name,
    s.total
FROM sales s
JOIN customers c
    ON s.customer_id = c.id;
```

En Oracle, los alias de las tablas pueden escribirse directamente después del nombre de la tabla. Por ejemplo, `sales s` y `customers c`. A diferencia de SQL Server, Oracle no utiliza `AS` para establecer alias de tablas.

**Evidencia:**

![alt text](./evidencias/oracle/image-8.png)
![alt text](./evidencias/oracle/image-9.png)

---

## 4. LIKE

El operador `LIKE` permite realizar búsquedas de texto utilizando patrones. El carácter `_` representa exactamente un carácter, mientras que `%` representa una cantidad variable de caracteres.

Debido a que la columna `name` almacena el nombre y el apellido en un mismo campo, se puede buscar un nombre que comience con `M` y tenga exactamente cinco caracteres, permitiendo que posteriormente exista un espacio y el apellido.

**Código:**

```sql
SELECT *
FROM customers
WHERE name LIKE 'M____'
   OR name LIKE 'M____ %';
```

En esta consulta, `M` representa el primer carácter y los cuatro caracteres `_` completan un nombre de cinco caracteres. La segunda condición permite que después del nombre exista un espacio seguido del apellido.

**Evidencia:**

![alt text](./evidencias/oracle/image-10.png)

---

## 5. JOIN

La cláusula `JOIN` permite combinar información de diferentes tablas mediante las relaciones existentes entre ellas.

Por ejemplo, se pueden relacionar los clientes con las ventas mediante `customer_id`:

```sql
SELECT
    c.name,
    s.id AS sale_id,
    s.sale_date,
    s.total
FROM customers c
JOIN sales s
    ON c.id = s.customer_id;
```

También se pueden relacionar las ventas con sus respectivos detalles y productos:

```sql
SELECT
    s.id AS sale_id,
    p.name AS product,
    sd.quantity,
    sd.unit_price,
    sd.total
FROM sales s
JOIN sale_details sd
    ON s.id = sd.sale_id
JOIN products p
    ON sd.product_id = p.id;
```

**Evidencia:**

![alt text](./evidencias/oracle/image-11.png)
![alt text](./evidencias/oracle/image-12.png)

---

## 6. AND

El operador `AND` permite combinar varias condiciones dentro de una consulta. Para que un registro sea seleccionado, todas las condiciones deben cumplirse.

Por ejemplo, para consultar ventas superiores a $100.000 que además se encuentren activas:

```sql
SELECT *
FROM sales
WHERE total > 100
  AND status = 'active';
```

**Evidencia:**

![alt text](./evidencias/oracle/image-13.png)

---

## 7. AS

La palabra reservada `AS` permite establecer alias para columnas. Los alias facilitan la lectura de las consultas y permiten utilizar nombres diferentes para mostrar los resultados.

En Oracle, `AS` puede utilizarse para asignar alias a las columnas, pero no se utiliza para asignar alias a las tablas.

**Código:**

```sql
SELECT
    c.name AS customer_name,
    c.email AS customer_email
FROM customers c;
```

También puede utilizarse para asignar un nombre diferente a una columna calculada:

```sql
SELECT
    AVG(price) AS average_price
FROM products;
```

**Evidencia:**

![alt text](./evidencias/oracle/image-14.png)
![alt text](./evidencias/oracle/image-15.png)

---

## 8. ON

La cláusula `ON` establece la condición que permite relacionar las tablas utilizadas mediante `JOIN`.

En el siguiente ejemplo se relaciona el identificador del cliente con el `customer_id` almacenado en las ventas:

```sql
SELECT
    c.name,
    s.id AS sale_id,
    s.total
FROM customers c
JOIN sales s
    ON c.id = s.customer_id;
```

La condición `ON c.id = s.customer_id` indica qué columnas deben coincidir para establecer la relación entre las tablas.

**Evidencia:**

![alt text](./evidencias/oracle/image-16.png)

---

## 9. ORDER BY

La cláusula `ORDER BY` permite ordenar los registros obtenidos por una consulta.

Por defecto, el orden es ascendente mediante `ASC`:

```sql
SELECT *
FROM products
ORDER BY price ASC;
```

También se puede utilizar `DESC` para ordenar de forma descendente:

```sql
SELECT *
FROM products
ORDER BY price DESC;
```

**Evidencia:**

![alt text](./evidencias/oracle/image-17.png)
![alt text](./evidencias/oracle/image-18.png)

---

## 10. COMPARADORES LÓGICOS

Los operadores de comparación permiten establecer condiciones para seleccionar determinados registros.

Los principales operadores son:

* `=` igual

* `<>` diferente

* `>` mayor que

* `<` menor que

* `>=` mayor o igual que

* `<=` menor o igual que

Por ejemplo:

```sql
SELECT *
FROM products
WHERE price >= 100;
```

También se pueden combinar varios operadores:

```sql
SELECT *
FROM products
WHERE price >= 50
  AND price <= 200;
```

**Evidencia:**

![alt text](./evidencias/oracle/image-19.png)
![alt text](./evidencias/oracle/image-21.png)
---

## 11. GROUP BY

La cláusula `GROUP BY` permite agrupar registros que tienen el mismo valor en una o varias columnas. Se utiliza principalmente junto con funciones de agregación.

Por ejemplo, se puede agrupar la cantidad de ventas realizadas por cada cliente:

```sql
SELECT
    customer_id,
    COUNT(*) AS total_sales
FROM sales
GROUP BY customer_id;
```

También se puede agrupar la cantidad de unidades vendidas por producto:

```sql
SELECT
    product_id,
    SUM(quantity) AS total_quantity
FROM sale_details
GROUP BY product_id;
```

**Evidencia:**

![alt text](./evidencias/oracle/image-22.png)
![alt text](./evidencias/oracle/image-23.png)

---

## 12. COUNT

La función `COUNT` permite contar la cantidad de registros de una tabla o de un grupo de registros.

Para conocer la cantidad total de clientes:

```sql
SELECT COUNT(*) AS total_customers
FROM customers;
```

También puede utilizarse junto con `GROUP BY`:

```sql
SELECT
    customer_id,
    COUNT(*) AS total_sales
FROM sales
GROUP BY customer_id;
```

**Evidencia:**

![alt text](./evidencias/oracle/image-24.png)
![alt text](./evidencias/oracle/image-25.png)

---

## 13. SUM

La función `SUM` permite calcular la suma de los valores de una columna numérica.

Para obtener el valor total de todas las ventas:

```sql
SELECT SUM(total) AS total_sales
FROM sales;
```

También se puede calcular la cantidad total de unidades vendidas por producto:

```sql
SELECT
    product_id,
    SUM(quantity) AS total_quantity
FROM sale_details
GROUP BY product_id;
```

**Evidencia:**

![alt text](./evidencias/oracle/image-26.png)
![alt text](./evidencias/oracle/image-27.png)

---

## 14. AVG

La función `AVG` permite calcular el promedio de los valores almacenados en una columna numérica.

Por ejemplo, se puede calcular el precio promedio de los productos:

```sql
SELECT AVG(price) AS average_price
FROM products;
```

También se puede obtener el promedio del valor de las ventas:

```sql
SELECT AVG(total) AS average_sale
FROM sales;
```

**Evidencia:**

![alt text](./evidencias/oracle/image-28.png)
![alt text](./evidencias/oracle/image-29.png)

---

## 15. HAVING

La cláusula `HAVING` permite establecer condiciones sobre los grupos obtenidos mediante `GROUP BY`.

A diferencia de `WHERE`, que filtra registros individuales, `HAVING` permite filtrar los resultados de una agrupación.

Por ejemplo, para mostrar los clientes que tengan más de una venta:

```sql
SELECT
    customer_id,
    COUNT(*) AS total_sales
FROM sales
GROUP BY customer_id
HAVING COUNT(*) > 1;
```

También se puede utilizar para identificar productos cuya cantidad total vendida sea superior a 10 unidades:

```sql
SELECT
    product_id,
    SUM(quantity) AS total_quantity
FROM sale_details
GROUP BY product_id
HAVING SUM(quantity) > 10;
```

**Evidencia:**

![alt text](./evidencias/oracle/image-30.png)
![alt text](./evidencias/oracle/image-31.png)

---

## 16. FUNCIONES DE AGREGACIÓN

Las funciones de agregación permiten realizar operaciones sobre un conjunto de registros y obtener un resultado.

Entre las principales funciones se encuentran:

* `COUNT()` para contar registros.

* `SUM()` para sumar valores.

* `AVG()` para calcular promedios.

* `MIN()` para obtener el valor mínimo.

* `MAX()` para obtener el valor máximo.

**Código:**

```sql
SELECT
    COUNT(*) AS total_products,
    AVG(price) AS average_price,
    MIN(price) AS minimum_price,
    MAX(price) AS maximum_price
FROM products;
```

**Evidencia:**

![alt text](./evidencias/oracle/image-32.png)

---

## 17. SUBCONSULTAS

Las subconsultas son consultas que se encuentran dentro de otra consulta. El resultado de la consulta interna puede utilizarse como condición para la consulta principal.

Por ejemplo, se pueden consultar los productos cuyo precio sea superior al precio promedio de todos los productos:

```sql
SELECT
    name,
    price
FROM products
WHERE price > (
    SELECT AVG(price)
    FROM products
);
```

También se pueden consultar los clientes que hayan realizado al menos una venta:

```sql
SELECT
    name,
    document_number
FROM customers
WHERE id IN (
    SELECT customer_id
    FROM sales
);
```

**Evidencia:**

![alt text](./evidencias/oracle/image-34.png)
![alt text](./evidencias/oracle/image-33.png)

---

# CONSULTAS AVANZADAS COMBINADAS

## 18. CONSULTA AVANZADA COMBINADA

### Situación hipotética

La empresa MovilCare necesita generar un reporte para el área comercial que permita identificar los productos que presentan un movimiento significativo dentro de las ventas.

El reporte debe mostrar el nombre del producto, la cantidad de registros de venta en los que aparece y la cantidad total de unidades vendidas. Solamente se consideran los detalles de venta activos y los productos cuyo precio sea superior al precio promedio de todos los productos.

Además, se requieren únicamente los productos que hayan aparecido en al menos dos registros de venta y que hayan acumulado como mínimo 50 unidades vendidas.

La consulta combina `JOIN`, `ON`, `WHERE`, `AND`, `AS`, `GROUP BY`, `COUNT`, `SUM`, `AVG`, `HAVING`, `ORDER BY` y una subconsulta.

### Consulta

```sql
SELECT
    p.name AS product_name,
    COUNT(sd.id) AS number_of_sales,
    SUM(sd.quantity) AS total_quantity_sold
FROM products p
JOIN sale_details sd
    ON p.id = sd.product_id
WHERE sd.status = 'active'
AND p.price > (
    SELECT AVG(price)
    FROM products
)
GROUP BY p.id, p.name
HAVING COUNT(sd.id) >= 2
AND SUM(sd.quantity) >= 50
ORDER BY total_quantity_sold ASC;
```

**Evidencia**
![alt text](image-68.png)

### Explicación

La consulta relaciona las tablas `products` y `sale_details` mediante `JOIN` y `ON`.

La cláusula `WHERE` permite filtrar los detalles activos y los productos cuyo precio supera el promedio de los productos.

La subconsulta obtiene dicho promedio mediante `AVG()`.

Posteriormente, `GROUP BY` agrupa la información por producto. `COUNT()` permite determinar la cantidad de registros de venta y `SUM()` calcula las unidades vendidas.

Finalmente, `HAVING` filtra los grupos que cumplen los valores mínimos establecidos y `ORDER BY` organiza los resultados según la cantidad total vendida.

### Creación del procedimiento

En Oracle se creó un procedimiento PL/SQL que recibe como parámetros la cantidad mínima de ventas y la cantidad mínima de unidades vendidas.

```sql
CREATE OR REPLACE PROCEDURE sp_product_sales_report (
    p_min_sales IN NUMBER,
    p_min_quantity IN NUMBER
)
AS
BEGIN

    FOR r IN (
        SELECT
            p.name AS product_name,
            COUNT(sd.id) AS number_of_sales,
            SUM(sd.quantity) AS total_quantity_sold
        FROM products p
        JOIN sale_details sd
            ON p.id = sd.product_id
        WHERE sd.status = 'active'
        AND p.price > (
            SELECT AVG(price)
            FROM products
        )
        GROUP BY p.id, p.name
        HAVING COUNT(sd.id) >= p_min_sales
        AND SUM(sd.quantity) >= p_min_quantity
        ORDER BY total_quantity_sold ASC
    )
    LOOP
        DBMS_OUTPUT.PUT_LINE(
            r.product_name
            || ' | Ventas: '
            || r.number_of_sales
            || ' | Unidades: '
            || r.total_quantity_sold
        );
    END LOOP;

END;
/
```

**Evidencia**
![alt text](image-69.png)

El procedimiento recibe los parámetros mediante `p_min_sales` y `p_min_quantity`, ejecuta la consulta y muestra los resultados mediante `DBMS_OUTPUT`.

### Creación mediante DBeaver

Para crear el procedimiento se utilizó la interfaz gráfica de DBeaver conectada al esquema de Oracle.

Se accedió a:

**Schema → Procedures → Create New Procedure**

Se estableció el nombre:

`SP_PRODUCT_SALES_REPORT`

Y se agregaron los parámetros:

| Parámetro | Tipo | Dirección |
|---|---|---|
| `P_MIN_SALES` | `NUMBER` | IN |
| `P_MIN_QUANTITY` | `NUMBER` | IN |

Posteriormente se ingresó el código PL/SQL correspondiente y se ejecutó la opción para crear el procedimiento.

**Evidencia:**

![alt text](image-70.png)

### Llamada al procedimiento

El procedimiento se ejecutó utilizando dos ventas como cantidad mínima y 50 unidades como cantidad mínima vendida:

```sql
EXEC sp_product_sales_report(2, 50);
```

**Evidencia:**

![alt text](image-71.png)

---

# APLICACIÓN DE TEORÍA DE CONJUNTOS MEDIANTE SUBCONSULTAS

## 19. TEORÍA DE CONJUNTOS

### Situación hipotética

El área comercial de MovilCare necesita analizar la relación entre los clientes registrados y aquellos que han realizado ventas.

Se consideran dos conjuntos:

- **Conjunto C:** clientes registrados.
- **Conjunto S:** clientes que aparecen en las ventas.

### Intersección entre clientes y clientes con ventas

Para obtener los clientes que pertenecen a ambos conjuntos:

```sql
SELECT *
FROM customers c
WHERE c.id IN (
    SELECT s.customer_id
    FROM sales s
);
```

Esta consulta representa:

**C ∩ S**

La subconsulta obtiene los identificadores de los clientes que aparecen en `sales`, mientras que la consulta externa devuelve los clientes que pertenecen a ese conjunto.

**Evidencia:**

![alt text](image-72.png)

---

### Diferencia entre clientes y clientes con ventas activas

Para identificar clientes registrados que no tienen ventas activas:

```sql
SELECT *
FROM customers c
WHERE c.id NOT IN (
    SELECT s.customer_id
    FROM sales s
    WHERE s.status = 'active'
);
```

Esta consulta representa:

**C - S**

La subconsulta obtiene los clientes con ventas activas y `NOT IN` permite excluirlos del conjunto general de clientes.

**Evidencia:**
![alt text](image-73.png)


---

### Clientes con ventas superiores al promedio

También se pueden identificar los clientes que realizaron ventas cuyo valor supera el promedio general:

```sql
SELECT DISTINCT
    c.id,
    c.name,
    c.email
FROM customers c
JOIN sales s
    ON c.id = s.customer_id
WHERE s.total > (
    SELECT AVG(total)
    FROM sales
);
```

**Evidencia:**

![alt text](image-74.png)

---

# TRIGGERS PARA AUDITORÍA

## 20. AUDITORÍA DE TABLAS MEDIANTE TRIGGERS

### Situación hipotética

La tabla `customers` fue seleccionada para auditoría porque contiene información de identificación y contacto de los clientes. Estos datos pueden ser modificados durante la operación normal de la empresa y es necesario conservar un registro de los cambios.

La tabla `sales` también fue seleccionada porque contiene información relacionada con las operaciones comerciales. Los cambios realizados sobre sus valores pueden afectar reportes y procesos posteriores.

Por este motivo se implementaron tablas de auditoría y triggers para registrar las operaciones `INSERT`, `UPDATE` y `DELETE`.

---

## 20.1 Auditoría de customers

### Tabla de auditoría

```sql
CREATE TABLE customers_audit (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id NUMBER NOT NULL,
    action_type CHAR(6) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    changed_by CHAR(255) DEFAULT 'unknown' NOT NULL,
    before_data VARCHAR2(4000),
    after_data VARCHAR2(4000),

    CONSTRAINT chk_customers_audit_action
        CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE'))
);
```

**Evidencia**
![alt text](image-75.png)

Los campos `before_data` y `after_data` almacenan una representación textual de los datos anteriores y posteriores a la operación.

### Trigger de auditoría

Oracle permite utilizar `:OLD` para obtener los valores anteriores y `:NEW` para obtener los valores posteriores.

```sql
CREATE OR REPLACE TRIGGER trg_customers_audit
AFTER INSERT OR UPDATE OR DELETE
ON customers
FOR EACH ROW
BEGIN

    IF INSERTING THEN

        INSERT INTO customers_audit (
            customer_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            :NEW.id,
            'INSERT',
            NULL,
            'id=' || :NEW.id
            || ', name=' || :NEW.name
            || ', document_type=' || :NEW.document_type
            || ', document_number=' || :NEW.document_number
            || ', phone=' || :NEW.phone
            || ', email=' || :NEW.email
            || ', status=' || :NEW.status
        );

    ELSIF UPDATING THEN

        INSERT INTO customers_audit (
            customer_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            :NEW.id,
            'UPDATE',
            'id=' || :OLD.id
            || ', name=' || :OLD.name
            || ', document_type=' || :OLD.document_type
            || ', document_number=' || :OLD.document_number
            || ', phone=' || :OLD.phone
            || ', email=' || :OLD.email
            || ', status=' || :OLD.status,
            'id=' || :NEW.id
            || ', name=' || :NEW.name
            || ', document_type=' || :NEW.document_type
            || ', document_number=' || :NEW.document_number
            || ', phone=' || :NEW.phone
            || ', email=' || :NEW.email
            || ', status=' || :NEW.status
        );

    ELSIF DELETING THEN

        INSERT INTO customers_audit (
            customer_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            :OLD.id,
            'DELETE',
            'id=' || :OLD.id
            || ', name=' || :OLD.name
            || ', document_type=' || :OLD.document_type
            || ', document_number=' || :OLD.document_number
            || ', phone=' || :OLD.phone
            || ', email=' || :OLD.email
            || ', status=' || :OLD.status,
            NULL
        );

    END IF;

END;
/
```
**Evidencia**
![alt text](image-76.png)

### Creación mediante DBeaver

El trigger se creó utilizando la interfaz gráfica de DBeaver.

Desde el navegador de Oracle se seleccionó el esquema correspondiente y posteriormente:

**Schema → Tables → CUSTOMERS → Triggers → Create New Trigger**

Se configuró el trigger para ejecutarse después de las operaciones `INSERT`, `UPDATE` y `DELETE`.

**Evidencia:**

![alt text](image-77.png)

### Verificación de la auditoría

Para comprobar el funcionamiento del trigger se realizó una modificación sobre un cliente:

```sql
UPDATE customers
SET phone = '3009999999'
WHERE id = 1;
```
**Evidencia**
![alt text](image-78.png)

Posteriormente se consultó la tabla de auditoría:

```sql
SELECT *
FROM customers_audit
ORDER BY changed_at DESC;
```

**Evidencia:**

![alt text](image-79.png)

---

## 20.2 Auditoría de sales

### Tabla de auditoría

La tabla `sales` fue seleccionada debido a que contiene información relacionada con las operaciones comerciales de la empresa.

```sql
CREATE TABLE sales_audit (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sale_id NUMBER NOT NULL,
    action_type CHAR(6) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    changed_by CHAR(255) DEFAULT 'unknown' NOT NULL,
    before_data VARCHAR2(4000),
    after_data VARCHAR2(4000),

    CONSTRAINT chk_sales_audit_action
        CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE'))
);
```

**Evidencia**
![alt text](image-80.png)

### Trigger de auditoría

```sql
CREATE OR REPLACE TRIGGER trg_sales_audit
AFTER INSERT OR UPDATE OR DELETE
ON sales
FOR EACH ROW
BEGIN

    IF INSERTING THEN

        INSERT INTO sales_audit (
            sale_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            :NEW.id,
            'INSERT',
            NULL,
            'id=' || :NEW.id
            || ', customer_id=' || :NEW.customer_id
            || ', sale_date=' || :NEW.sale_date
            || ', subtotal=' || :NEW.subtotal
            || ', taxes=' || :NEW.taxes
            || ', total=' || :NEW.total
            || ', status=' || :NEW.status
        );

    ELSIF UPDATING THEN

        INSERT INTO sales_audit (
            sale_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            :NEW.id,
            'UPDATE',
            'id=' || :OLD.id
            || ', customer_id=' || :OLD.customer_id
            || ', sale_date=' || :OLD.sale_date
            || ', subtotal=' || :OLD.subtotal
            || ', taxes=' || :OLD.taxes
            || ', total=' || :OLD.total
            || ', status=' || :OLD.status,
            'id=' || :NEW.id
            || ', customer_id=' || :NEW.customer_id
            || ', sale_date=' || :NEW.sale_date
            || ', subtotal=' || :NEW.subtotal
            || ', taxes=' || :NEW.taxes
            || ', total=' || :NEW.total
            || ', status=' || :NEW.status
        );

    ELSIF DELETING THEN

        INSERT INTO sales_audit (
            sale_id,
            action_type,
            before_data,
            after_data
        )
        VALUES (
            :OLD.id,
            'DELETE',
            'id=' || :OLD.id
            || ', customer_id=' || :OLD.customer_id
            || ', sale_date=' || :OLD.sale_date
            || ', subtotal=' || :OLD.subtotal
            || ', taxes=' || :OLD.taxes
            || ', total=' || :OLD.total
            || ', status=' || :OLD.status,
            NULL
        );

    END IF;

END;
/
```

**Evidencia**
![alt text](image-81.png)

### Creación mediante DBeaver

El trigger se creó mediante la interfaz gráfica de DBeaver, asociado a la tabla `sales`.

**Evidencia:**
![alt text](image-82.png)

### Verificación de la auditoría

Para comprobar el funcionamiento del trigger se modificó una venta:

```sql
UPDATE sales
SET total = total + 1000
WHERE id = 1;
```

![alt text](image-83.png)

Posteriormente se consultaron los registros generados:

```sql
SELECT *
FROM sales_audit
ORDER BY changed_at DESC;
```

**Evidencia:**

![alt text](image-84.png)