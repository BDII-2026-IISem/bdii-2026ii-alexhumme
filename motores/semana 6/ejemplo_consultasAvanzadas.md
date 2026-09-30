# Ejemplo de consultas avanzadas combinadas

```sql
SELECT 
    PT.name as nombre,
    PR.product_type_id as tipo,
    count(PR.product_type_id) as cantidad_de_productos
    sum(PR.quantity) as stock_de_productos
FROM products PR
JOIN product_types PT 
ON PR.product_type_id = PT.id
GROUP BY PR.product_type_id
HAVING tipo >= 2
AND stock_de_productos >= 50
ORDER BY stock_de_productos ASC;
```

## para volverlo procedimiento

```sql
CREATE PROCEDURE database.procedure_name(param type)
BEGIN
-- CONSULTA
END
```

### llamar al procedimiento

```sql
{ CALL database.procedure_name(params) }
```

## aplicar teoria de conjuntos a las consultas por medio de las subconsultas

```sql
-- CL AND SL
SELECT *
FROM clients CL
JOIN sales SL
ON CL.id = SL.client_id

-- CL - SL
SELECT *
FROM clients CL
JOIN sales SL
ON CL.id 
NOT IN( 
    SELECT SL.client_id 
    FROM sales SL 
    WHERE SL.status = "active"
    );  
```

## TRIGGERS

Ejecutar una accion cuando se de un evento

1. Se crea una tabla paralela de auditoria pa la tabla a auditar

```sql
CREATE TABLE table_audit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_id BIGINT NOT NULL, -- FOREIGN KEY
    actionTable ENUM('UPDATE', 'DELETE', 'INSERT') NOT NULL DEFAULT 'INSERT'
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTSTAMP,
    changed_by VARCHAR(255) NOT NULL DEFAULT 'unknown',
    before_data JSON NULL,
    after_data JSON NULL
)
```

2. Crear el triggers

```SQL

-- INSERT
DELIMETER $$
CREATE TRIGGER ai_table_audit
AFTER INSERT ON table
FOR EACH ROW
BEGIN
    SET @from_table_trigger = 1
    INSERT INTO table_audit(id, actionTable, before_data, after_data)
    VALUES (
        NEW.id,
        'INSERT',
        NULL,
        JSON_OBJECT(
            'id', NEW.id,
            -- y asi con el resto de columna de la tabla
        )
    )

END $$

-- para las otrass consultas se incluye antes de insertar
```

## TAREA

aplicar todos estos conceptos en el contexto del proyecto planteando situaciones
particularmente con los trigger "escogi esta tabla para hacele una auditoria porqque es vulnerable a..." hacer minimo 2 de trigger
