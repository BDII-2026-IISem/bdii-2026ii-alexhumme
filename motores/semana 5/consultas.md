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

