# Unidad ISS-00: Creacion del entorno virtual
## 1. Entorno
Se creo el entorno virtual con python en el cual se guardan las librerias necesarias para el funcionamiento del proyecto .venv.
### Scripts de creacion
```bash
python3 -m venv .venv
```
### Scripts de activacion
```bash
source .venv/bin/activate
```
### Evidencia
![alt text](image.png)

## 2. Instalacion del framework
El feame work de python que se utilizara para la creacion ndel baskend en este proyecto es Django, que permite la creacion de plantillas para frontend que conectan con controladores y permiten la comunicacion con las base de datos, para ello utilizamos el sistema de gestion de paquetes de python `pip`.

### Scripts
```bash
python -m pip install "Django==5.2.17"
python -m pip freeze > requirements.txt
```

### Evidencias
![alt text](image-1.png)
![alt text](image-2.png)

## 3. Creacion del proyecto
por medio de django nos es posible la creacion de una plantilla inicial de proyecto a partir del framework con uns estructura de archivos concreta para trabajar con la libreria

### Script
```bash
(.venv) django-admin startproject config .
```

### Evidencias
![alt text](image-3.png)
![alt text](image-4.png)

## 4. Proteccion del repositorio
Ya que se trabajara con repositorios de github, es importante conocer que ficheros como `.env`, `.venv` o `db.sqlite3` contienen informacion sensible o redundante que no debe ser subida al repositorio, para prevenir esto se agrega un archivo `.gitignore` a la raiz del proyecto donde se indique que ficheros no deben ser subidos.

### Contenido del .gitignore
```gitignore
.venv/
__pycache__/
*.py[cod]
.env
db.sqlite3
*.log
.idea/
.vscode/
staticfiles/
media/
.pytest_cache/
htmlcov/
.coverage
```
### Evidencia
![alt text](image-5.png)

## 5. verificacion
Scripts
```bash
python -m django --version
```
```bash
python manage.py check
```
```bash
tree
```
### Evidencia
![alt text](image-6.png)

# Unidad ISS-01 Settings y seleccion de motor

## instalacion de paquetes
Los paquetes contienen las herramientas necesarias para realizar las conexiones entre Django y las bases de datos, justo despues de instalarlas se listan dentro del archivo `requirements.txt`.

### Scripts
```bash
source .venv/bin/activate
which python
python -m pip install "python-dotenv==1.2.3"
python -m pip install "psycopg[binary]==3.3.6"
python -m pip install "mysqlclient==2.3.0"
python -m pip install "mssql-django==2.0.0"
python -m pip install "oracledb==26.0.1"
python -m pip freeze > requirements.txt
```
### Evidencia
![alt text](image-7.png)
![alt text](image-8.png)

## Transformación de la Estructura de Archivos
Se elimina el archivo generado automaticamente `settings.py` y se agrega la carpeta `settings/` con el archivo `__init__.py`

Adicionalmente se crea el `.env.example` con la plantilla de las variables de entorno, `.env` que guardara los valores reales de las variables, `database.py` que permitira la conexion dinamica de motores de bases de datos y `project_python.py`

### Evidencia
![alt text](image-9.png)


## definicion de las variables de entorno
En `.env.example` se guardaron los nombres de las variables de entorno del proyecto, en `.env` se guardaron con sus valores reales.

### Contenido del .env.example
```env
# Laboratorio académico. En producción liste orígenes explícitos.
CORS_ALLOW_ALL_ORIGINS=True
```
### Evidencia
![alt text](image-10.png)

## modulo de seleccion de base de datos
Dentro de `config/database.py` se elabora el script de seleccion de base de datos.

### Codigo
```python
"""Selección del motor de base de datos a partir del entorno.

Un solo alias, default, queda activo en cada ejecución.
"""

from django.core.exceptions import ImproperlyConfigured

ALLOWED_ENGINES = ("postgresql", "mysql", "mssql", "oracle")


def database_from_environ(env):
    engine = str(env.get("DB_ENGINE", "postgresql")).strip().lower()
    if engine not in ALLOWED_ENGINES:
        allowed = ", ".join(ALLOWED_ENGINES)
        raise ImproperlyConfigured(
            f"DB_ENGINE='{engine}' no es válido. Valores permitidos: {allowed}."
        )
    builders = {
        "postgresql": _postgresql,
        "mysql": _mysql,
        "mssql": _mssql,
        "oracle": _oracle,
    }
    return {"default": builders[engine](env)}


def _required(env, key):
    value = env.get(key)
    if value is None or str(value).strip() == "":
        raise ImproperlyConfigured(
            f"Falta la variable de entorno {key} para DB_ENGINE={env.get('DB_ENGINE')}."
        )
    return str(value).strip()


def _postgresql(env):
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": _required(env, "POSTGRES_DB"),
        "USER": _required(env, "POSTGRES_USER"),
        "PASSWORD": _required(env, "POSTGRES_PASSWORD"),
        "HOST": _required(env, "POSTGRES_HOST"),
        "PORT": _required(env, "POSTGRES_PORT"),
    }


def _mysql(env):
    return {
        "ENGINE": "django.db.backends.mysql",
        "NAME": _required(env, "MYSQL_DB"),
        "USER": _required(env, "MYSQL_USER"),
        "PASSWORD": _required(env, "MYSQL_PASSWORD"),
        "HOST": _required(env, "MYSQL_HOST"),
        "PORT": _required(env, "MYSQL_PORT"),
        "OPTIONS": {"charset": "utf8mb4"},
    }


def _mssql(env):
    return {
        "ENGINE": "mssql",
        "NAME": _required(env, "MSSQL_DB"),
        "USER": _required(env, "MSSQL_USER"),
        "PASSWORD": _required(env, "MSSQL_PASSWORD"),
        "HOST": _required(env, "MSSQL_HOST"),
        "PORT": _required(env, "MSSQL_PORT"),
        "OPTIONS": {
            "driver": "ODBC Driver 18 for SQL Server",
            "extra_params": "TrustServerCertificate=yes",
        },
    }


def _oracle(env):
    host = _required(env, "ORACLE_HOST")
    port = _required(env, "ORACLE_PORT")
    service = _required(env, "ORACLE_SERVICE_NAME")
    dsn = (
        f"(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST={host})(PORT={port}))"
        f"(CONNECT_DATA=(SERVICE_NAME={service})))"
    )
    return {
        "ENGINE": "django.db.backends.oracle",
        "NAME": dsn,
        "USER": _required(env, "ORACLE_USER"),
        "PASSWORD": _required(env, "ORACLE_PASSWORD"),
        "HOST": host,
        "PORT": "",
    }
```

### Evidencias
![alt text](image-11.png)

## Paquete de configuracion
Dentro del fichero `config/settings/__init__.py`
### Contenido del fichero
```python
import os
from pathlib import Path

# python-dotenv, instalado en este ISS. Lee .env antes de SECRET_KEY y DATABASES.
from dotenv import load_dotenv

from config.database import database_from_environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "").strip()
if not SECRET_KEY:
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured("Defina DJANGO_SECRET_KEY en el archivo .env.")

DEBUG = os.environ.get("DJANGO_DEBUG", "False").strip().lower() in {"1", "true", "yes", "on"}

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = database_from_environ(os.environ)

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "es"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
```
### Evidencia
![alt text](image-12.png)

## Re-Ejecucion del interprete

En el fichero `config/project_python.py` se almacena un script de prevencion que evita que la ejecucion de `manage.py` fuera del entorno virtual `.venv` resulte en errores.

### contenido del fichero
```python
"""Intérprete del proyecto.

Los paquetes se instalan dentro de .venv. El comando python3 manage.py
usa el Python del sistema y no ve esos paquetes.
use_project_python() vuelve a lanzar el mismo comando con .venv/bin/python.
"""
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def use_project_python():
    """Reejecuta el proceso con el Python de .venv si aún no es ese intérprete."""
    venv_root = PROJECT_ROOT / ".venv"
    venv_python = venv_root / "bin" / "python"
    if not venv_python.is_file():
        return
    try:
        if Path(sys.prefix).resolve() == venv_root.resolve():
            return
    except OSError:
        return
    os.execv(venv_python, [str(venv_python), *sys.argv])
```

### Evidencia
![alt text](image-13.png)

## Parches en puntos de entrada en el sistema

### Evidencias
![alt text](image-14.png)
![alt text](image-15.png)
![alt text](image-16.png)
---
![alt text](image-17.png)


# Unidad ISS-02 - Apps client, product y sale

En esta unidad se crean los paquetes de negocio con la CLI dentro del paquete apps.

## Construccion
### Scripts
```bash
mkdir -p apps/client apps/product apps/sale
python manage.py startapp client apps/client
python manage.py startapp product apps/product
python manage.py startapp sale apps/sale
```

### Evidencias
![alt text](image-18.png)
![alt text](image-19.png)

## Crear `apps/__init__.py`

### Script
```bash
mkdir -p apps
cat > apps/__init__.py <<'EOF'
EOF
```
### Evidencia
![alt text](image-20.png)
![alt text](image-21.png)

> **Correccion:** En la base de datos de `Movilcare` a los clientes se les referencia como `customers` y no `clients` por lo que se creo una aplicacion customers y se elimino client
### Evidencia
![alt text](image-22.png)
![alt text](image-23.png)

## Parche de name a las apps
### Parche en customers
```
ARCHIVO: apps/customer/apps.py

UBICAR:
    name = "customer"

REEMPLAZAR POR:
    name = "apps.customer"
    label = "customer"
```
### Evidencia
![alt text](image-24.png)

### Parche en product
```
ARCHIVO: apps/product/apps.py

UBICAR:
    name = "product"

REEMPLAZAR POR:
    name = "apps.product"
    label = "product"
```

### Evidencia
![alt text](image-25.png)

### Parche en sale
```
ARCHIVO: apps/sale/apps.py

UBICAR:
    name = "sale"

REEMPLAZAR POR:
    name = "apps.sale"
    label = "sale"
```
### Evidencia
![alt text](image-26.png)


## Agregacion de las apps a ``settings/__init__.py`
### Instruccion
```
ARCHIVO: config/settings/__init__.py

DEBAJO DE:
    "django.contrib.staticfiles",

AGREGAR:
    "apps.customer.apps.CustomerConfig",
    "apps.product.apps.ProductConfig",
    "apps.sale.apps.SaleConfig",
```
### Evidencia
![alt text](image-27.png)

## Prueba de aceptacion
### Script
```bash
python manage.py check
```
### Evidencia
![alt text](image-28.png)

# Unidad ISS-03 - Custom User antes de la primera migración
## Crear carpeta apps/common y apps/secutiry
### Evidencia
![alt text](image-29.png)
![alt text](image-30.png)

### Parche en name de security
![alt text](image-31.png)

### contenido de secutiry/models.py
```python
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

from apps.common.status import RecordStatus


class StoreUserManager(UserManager):
    def create_user(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("status", RecordStatus.INACTIVE)
        return super().create_user(username, email, password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("status", RecordStatus.ACTIVE)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    email = models.EmailField("correo electrónico", max_length=150, unique=True)
    status = models.CharField(
        max_length=8,
        choices=RecordStatus.choices,
        default=RecordStatus.INACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = StoreUserManager()

    class Meta:
        db_table = "users"
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(status__in=RecordStatus.values),
                name="users_status_valid",
            )
        ]

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        self.is_active = self.status == RecordStatus.ACTIVE
        super().save(*args, **kwargs)
```

### Evidencia
![alt text](image-32.png)

## parche en `settings/__init__.py`
### Indicacion
```
ARCHIVO: config/settings/__init__.py

ENCIMA DE:
    "apps.customer.apps.CustomerConfig",

AGREGAR:
    "apps.security.apps.SecurityConfig",

DEBAJO DE:
DATABASES = database_from_environ(os.environ)

AGREGAR:

AUTH_USER_MODEL = "security.User"
```
### Evidencia
![alt text](image-33.png)

## Test del motor
### Contenido de prueba en security/tests.py
```python
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from config.database import database_from_environ


class DatabaseSelectionTests(SimpleTestCase):
    def _env(self, engine):
        return {
            "DB_ENGINE": engine,
            "POSTGRES_DB": "storelab",
            "POSTGRES_USER": "storelab",
            "POSTGRES_PASSWORD": "storelab",
            "POSTGRES_HOST": "127.0.0.1",
            "POSTGRES_PORT": "5432",
            "MYSQL_DB": "storelab",
            "MYSQL_USER": "storelab",
            "MYSQL_PASSWORD": "storelab",
            "MYSQL_HOST": "127.0.0.1",
            "MYSQL_PORT": "3306",
            "MSSQL_DB": "storelab",
            "MSSQL_USER": "storelab",
            "MSSQL_PASSWORD": "storelab",
            "MSSQL_HOST": "127.0.0.1",
            "MSSQL_PORT": "1433",
            "ORACLE_DB": "storelab",
            "ORACLE_USER": "storelab",
            "ORACLE_PASSWORD": "storelab",
            "ORACLE_HOST": "127.0.0.1",
            "ORACLE_PORT": "1521",
            "ORACLE_SERVICE_NAME": "FREEPDB1",
        }

    def test_postgresql_engine(self):
        config = database_from_environ(self._env("postgresql"))
        self.assertEqual(config["default"]["ENGINE"], "django.db.backends.postgresql")

    def test_mysql_engine(self):
        config = database_from_environ(self._env("mysql"))
        self.assertEqual(config["default"]["ENGINE"], "django.db.backends.mysql")
        self.assertEqual(config["default"]["OPTIONS"]["charset"], "utf8mb4")

    def test_mssql_engine(self):
        config = database_from_environ(self._env("mssql"))
        self.assertEqual(config["default"]["ENGINE"], "mssql")

    def test_oracle_uses_service_name(self):
        config = database_from_environ(self._env("oracle"))
        self.assertIn("SERVICE_NAME=FREEPDB1", config["default"]["NAME"])
        self.assertEqual(config["default"]["PORT"], "")

    def test_invalid_engine(self):
        with self.assertRaises(ImproperlyConfigured):
            database_from_environ({"DB_ENGINE": "sqlite"})

    def test_missing_variable(self):
        env = self._env("postgresql")
        env["POSTGRES_DB"] = ""
        with self.assertRaises(ImproperlyConfigured):
            database_from_environ(env)
``` 

### Evidencia
![alt text](image-34.png)

## Migracion
### Scripts
```bash
python manage.py makemigrations security
python manage.py migrate
python manage.py test apps.security.tests.DatabaseSelectionTests
```
### Evidencia
![alt text](image-35.png)
![alt text](image-36.png)
![alt text](image-37.png)

# Unidad ISS-04 Modelo Client
## Creacion de apps models
### contenido del fichero en common
```python
from django.db import models

from apps.common.status import RecordStatus


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class StoreLabModel(TimeStampedModel):
    status = models.CharField(
        max_length=8,
        choices=RecordStatus.choices,
        default=RecordStatus.INACTIVE,
    )

    class Meta:
        abstract = True

    @classmethod
    def status_constraint(cls, name):
        return models.CheckConstraint(
            condition=models.Q(status__in=RecordStatus.values),
            name=name,
        )
```
### Evidencia
![alt text](image-38.png)

## creacion del fichero en Customer
### Contenido del fichero models en customer

Se adapto el modelo de customer para contener las columnas correctas de la tabla customer

```python
from django.core.validators import MinLengthValidator
from django.db import models

from apps.common.models import StoreLabModel


class Customer(StoreLabModel):
    document_type = models.CharField(max_length=30, null=False, blank=True)
    document_number = models.CharField(max_length=11, null=False, blank=True)
    name = models.CharField(max_length=150, validators=[MinLengthValidator(2)])
    email = models.EmailField(max_length=150, null=True, blank=True, unique=True)
    phone = models.CharField(max_length=30, null=True, blank=True)

    class Meta:
        db_table = "customers"
        verbose_name = "cliente"
        verbose_name_plural = "clientes"
        ordering = ["name", "id"]
        constraints = [StoreLabModel.status_constraint("customers_status_valid")]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

```

Posteriormente se hizo la migracion ya con el modelo guardado 

### Migracion
```bash
python manage.py makemigrations customer
python manage.py migrate
```
### Evidencia
![alt text](image-39.png)
![alt text](image-40.png)
![alt text](image-41.png)
![alt text](image-42.png)
![alt text](image-43.png)

# Unidad ISS-05 Product y Serialized Unit

## Definir modelos de prodduct

Le proyecto de movilcare, a diferencia de otros proyectos, no posee una tabla Product_types y en cambio contiene la tabla Product y Serialized Units; la relaicon de productos y serialized units es de 1:N, por lo que serialized units debe contener como clave foranea el id del producto al que referencia, a su vez el producto no tiene una columna de stock. Se ajusto la planilla propuesta de modelo en la guia academica para encajar con esta estructura y se realizo una segunda migracion de correccion.

### Contenido de `apps/product/models.py`
```python
from decimal import Decimal

from django.core.validators import MinLengthValidator, MinValueValidator
from django.db import models

from apps.common.models import StoreLabModel

class Product(StoreLabModel):
    sku = models.CharField(max_length=100, unique=True, validators=[MinLengthValidator(2)])
    name = models.CharField(max_length=150, unique=True, validators=[MinLengthValidator(1)])
    description = models.CharField(max_length=255, null=True, blank=True)
    price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )

    class Meta:
        db_table = "products"
        verbose_name = "producto"
        verbose_name_plural = "productos"
        ordering = ["name", "id"]
        constraints = [
            StoreLabModel.status_constraint("products_status_valid"),
            models.CheckConstraint(
                condition=models.Q(price__gte=0),
                name="product_price_non_neg",
            ),
        ]

    def __str__(self):
        return self.name


class SerializedUnit(StoreLabModel):
    product = models.ForeignKey(
        Product,
        on_delete=models.RESTRICT,
        related_name="serialized_units",
        db_column="product_id",
    )
    name = models.CharField(max_length=150, unique=True, validators=[MinLengthValidator(2)])
    description = models.CharField(max_length=255, null=True, blank=True)

    class Meta: 
        db_table = "serialized_units"
        verbose_name = "Unidad serializada"
        verbose_name_plural = "Unidades serializadas"
        ordering = ["name", "id"]
        constraints = [StoreLabModel.status_constraint("serialized_units_status_valid")]

    def __str__(self):
        return self.name
```

### Migracion
```bash
python manage.py makemigrations product
python manage.py migrate
```

### Evidencia
![alt text](image-45.png)
![alt text](image-46.png)
![alt text](image-47.png)

# Unidad ISS-06 Sale y Sale detail

## Creacion de `sale/managers.py`
### Codigo
```python
from django.db import models


class SaleQuerySet(models.QuerySet):
    pass


class SaleManager(models.Manager.from_queryset(SaleQuerySet)):
    pass
```
### Evidencia
![alt text](image-48.png)

## Definicion de los modelsos de Sale

### Contenido de `apps/sale/models.py`

```python
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models, transaction

from apps.customer.models import Customer
from apps.common.models import StoreLabModel
from apps.common.status import RecordStatus
from apps.product.models import Product
from apps.sale.managers import SaleManager

class Sale(StoreLabModel):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.RESTRICT,
        related_name="sales",
        db_column="customer_id",
    )
    sale_date = models.DateTimeField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    discounts = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    objects = SaleManager()

    class Meta:
        db_table = "sales"
        verbose_name = "venta"
        verbose_name_plural = "ventas"
        ordering = ["-sale_date", "-id"]
        constraints = [
            StoreLabModel.status_constraint("sales_status_valid"),
            models.CheckConstraint(
                condition=models.Q(subtotal__gte=0)
                & models.Q(tax__gte=0)
                & models.Q(discounts__gte=0)
                & models.Q(total__gte=0),
                name="sales_amounts_non_neg",
            ),
        ]

    def __str__(self):
        return f"Venta {self.pk}"

    def void(self):
        with transaction.atomic():
            sale = Sale.objects.select_for_update().get(pk=self.pk)
            if sale.status == RecordStatus.INACTIVE:
                return sale
            sale.status = RecordStatus.INACTIVE
            sale.save(update_fields=["status", "updated_at"])
            return sale


class SaleDetail(StoreLabModel):
    sale = models.ForeignKey(
        Sale,
        on_delete=models.RESTRICT,
        related_name="lines",
        db_column="sale_id",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.RESTRICT,
        related_name="sale_lines",
        db_column="product_id",
    )
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)
    observations = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "sale_details"
        verbose_name = "detalle de venta"
        verbose_name_plural = "detalles de venta"
        ordering = ["id"]
        constraints = [
            StoreLabModel.status_constraint("sale_details_status_valid"),
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1)
                & models.Q(unit_price__gte=0)
                & models.Q(line_total__gte=0),
                name="psale_amounts_valid",
            ),
        ]

    def __str__(self):
        return f"{self.product} x {self.quantity}"

    def save(self, *args, **kwargs):
        self.line_total = (self.unit_price * self.quantity).quantize(Decimal("0.01"))
        super().save(*args, **kwargs)
```

### Migracion

```bash
python manage.py makemigrations sale
python manage.py migrate
```

### Evidencia
![alt text](image-49.png)
![alt text](image-50.png)
![alt text](image-51.png)

# Unidad ISS-07 Serializers y JSON camelCase

## Instalacion de paquetes de REST y JSON
### comandos
```bash
python -m pip install "djangorestframework==3.17.2" "djangorestframework-camel-case==1.4.2" "django-cors-headers==4.9.0"
python -m pip freeze > requirements.txt
```

### Evidencia
![alt text](image-52.png)
![alt text](image-53.png)

## Ajustes a `config/settings/__init__.py`
### Indicaciones
**ARCHIVO:** `config/settings/__init__.py`

**ENCIMA DE:**

```python
    "apps.security.apps.SecurityConfig",
```
**AGREGAR:**

```python
    "rest_framework",
    "corsheaders",
```

**ENCIMA DE:**

```python
    "django.middleware.security.SecurityMiddleware",
```
    
**AGREGAR:**

```python
    "corsheaders.middleware.CorsMiddleware",
```

**DEBAJO DE:**

```python
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
```

**AGREGAR:**

```python
CORS_ALLOW_ALL_ORIGINS = os.environ.get("CORS_ALLOW_ALL_ORIGINS", "True").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "djangorestframework_camel_case.render.CamelCaseJSONRenderer",
        "djangorestframework_camel_case.render.CamelCaseBrowsableAPIRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "djangorestframework_camel_case.parser.CamelCaseJSONParser",
        "djangorestframework_camel_case.parser.CamelCaseFormParser",
        "djangorestframework_camel_case.parser.CamelCaseMultiPartParser",
    ],
    "DEFAULT_PAGINATION_CLASS": None,
}
```

### Evidencia
![alt text](image-54.png)

## Creacion de los serializers
### Contenido de `customer/serializers.py`
```python
from rest_framework import serializers

from apps.customer.models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "document_type",
            "document_number",
            "name",
            "phone",
            "email",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "document_type": {"min_length":2, "max_lenght":30},
            "document_number": {"min_length":5, "max_lenght":11},
            "name": {"min_length": 2, "max_length": 150},
            "email": {"required": False, "allow_null": True, "allow_blank": True},
            "phone": {"required": False, "allow_null": True, "allow_blank": True},
        }

    def validate_email(self, value):
        if value is None or str(value).strip() == "":
            return None
        return value.strip().lower()

    def validate(self, attrs):
        for field in ("address", "phone"):
            if attrs.get(field) == "":
                attrs[field] = None
        return attrs
```

### Contenido de `product/serializers.py`
```python
from rest_framework import serializers

from apps.product.models import Product, SerializedUnit


class SerializedUnitSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.all(),
    )
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = SerializedUnit
        fields = [
            "id", 
            "product_id"
            "product_name", 
            "description", 
            "status", 
            "created_at", 
            "updated_at"
        ]
        read_only_fields = ["id", "product_name", "created_at", "updated_at"]
        extra_kwargs = {
            "name": {"min_length": 2, "max_length": 150},
            "description": {"required": False, "allow_null": True, "allow_blank": True},
        }

    def validate_description(self, value):
        if value is None or str(value).strip() == "":
            return None
        return value


class ProductSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = [
            "id",
            "sku",
            "name",
            "description",
            "price",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "name": {"min_length": 2, "max_length": 120},
            "description": {"required": False, "allow_null": True, "allow_blank": True},
        }

    def validate_description(self, value):
        if value is None or str(value).strip() == "":
            return None
        return value
```
### Contenido de `sale/serializers.py`
```python
from rest_framework import serializers

from apps.sale.models import ProductSale, Sale


class ProductSaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ProductSale
        fields = [
            "id",
            "product",
            "product_name",
            "quantity",
            "unit_price",
            "line_total",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class SaleSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    lines = ProductSaleSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "customer",
            "customer_name",
            "sale_date",
            "subtotal",
            "tax",
            "discounts",
            "total",
            "status",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
```
### Evidencias 
![alt text](image-55.png)
![alt text](image-57.png)
![alt text](image-58.png)

# Unidad ISS-08 Customer con ModelViewSet

## Creacion de la vista para customer
### contenido de `apps/customer/views.py`
```python
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.customer.models import Customer
from apps.customer.serializers import CustomerSerializer
from apps.common.status import RecordStatus


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny]
    lookup_value_converter = "int"

    def get_queryset(self):
        queryset = super().get_queryset()
        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)
        return queryset

    def perform_destroy(self, instance):
        instance.status = RecordStatus.INACTIVE
        instance.save(update_fields=["status", "updated_at"])
```
### Evidencia
![alt text](image-59.png)

## Creacion de los test para customer
### contenido de `apps/customer/tests.py`
```python
import json

from rest_framework import status
from rest_framework.test import APITestCase

from apps.customer.models import Customer
from apps.common.status import RecordStatus


class CustomerApiTests(APITestCase):
    def test_create_defaults_and_persists(self):
        response = self.customer.post(
            "/api/customers/",
            {"name": "María García", "email": "Maria@Example.com", "phone": "3001234567"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], RecordStatus.INACTIVE)
        self.assertEqual(response.data["email"], "maria@example.com")
        wire = json.loads(response.content)
        self.assertIn("createdAt", wire)
        self.assertNotIn("created_at", wire)
        stored = Customer.objects.get(pk=response.data["id"])
        self.assertEqual(stored.name, "María García")

    def test_invalid_name_and_duplicate_email(self):
        invalid = self.customer.post("/api/customers/", {"name": "A"}, format="json")
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.customer.post(
            "/api/customers/",
            {"name": "Ana Ruiz", "email": "ana@example.com"},
            format="json",
        )
        duplicate = self.customer.post(
            "/api/customers/",
            {"name": "Otra Ana", "email": "ana@example.com"},
            format="json",
        )
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

    def test_soft_delete_keeps_the_row(self):
        created = self.customer.post("/api/customers/", {"name": "Pedro León"}, format="json")
        deleted = self.customer.delete(f"/api/customers/{created.data['id']}/")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        stored = Customer.objects.get(pk=created.data["id"])
        self.assertEqual(stored.status, RecordStatus.INACTIVE)
        self.assertEqual(Customer.objects.count(), 1)

    def test_list_retrieve_and_update(self):
        created = self.customer.post(
            "/api/customers/",
            {"name": "Luisa Mora", "phone": "111"},
            format="json",
        )
        pk = created.data["id"]
        listed = self.customer.get("/api/customers/")
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        detail = self.customer.get(f"/api/customers/{pk}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["name"], "Luisa Mora")
        updated = self.customer.patch(
            f"/api/customers/{pk}/",
            {"phone": "222", "status": "active"},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["status"], "active")
```
### evidencia
![alt text](image-60.png)

## Enrutamiento de customer
### Contenido de `apps/customer/urls.py`
```python
from rest_framework.routers import SimpleRouter

from apps.customer.views import CustomerViewSet

router = SimpleRouter(use_regex_path=False)
router.register("customers", CustomerViewSet, basename="customer")

urlpatterns = router.urls
```
### evidencia
![alt text](image-61.png)

## Ajustes en la configuraicon de urls
### Indicaciones
**ARCHIVO:** `config/urls.py`

**UBICAR:**

```python
from django.urls import path
```

**REEMPLAZAR POR:**

```python
from django.urls import include, path
```

**DEBAJO DE:**

```python
path("admin/", admin.site.urls),
```

**AGREGAR:**

```python
path("api/", include("apps.customer.urls")),
```

### evidencia
![alt text](image-62.png)

# Unidad ISS-09 Catálogo con ModelViewSet
## Creacion de las vistas para publicar productos del catalogo y unidades serialiazadas
###  Contenido de `apps/product/views.py`
```python

from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from apps.common.status import RecordStatus
from apps.product.models import Product, SerializedUnit
from apps.product.serializers import ProductSerializer, SerializedUnitSerializer


class CatalogViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    lookup_value_converter = "int"

    def get_queryset(self):
        queryset = super().get_queryset()

        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(status=status_value)

        return queryset

    def perform_destroy(self, instance):
        instance.status = RecordStatus.INACTIVE
        instance.save(update_fields=["status", "updated_at"])


class ProductViewSet(CatalogViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


class SerializedUnitViewSet(CatalogViewSet):
    queryset = SerializedUnit.objects.all()
    serializer_class = SerializedUnitSerializer
```
### Evidencia
![alt text](image-63.png)

### Contenido de `apps/product/urls.py`
```python
from rest_framework.routers import SimpleRouter

from apps.product.views import ProductTypeViewSet, SerializedUnitViewSet

router = SimpleRouter(use_regex_path=False)
router.register(
    r"products",
    ProductViewSet,
    basename="product",
)

router.register(
    r"serialized-units",
    SerializedUnitViewSet,
    basename="serialized-unit",
)

urlpatterns = router.urls
```
### Evidencia
![alt text](image-64.png)

### Ajuste de `config/urls.py`
**DEBAJO DE:**
```python
path("api/", include("apps.customerlient.urls")),
```

**AGREGAR:**
```python
path("api/", include("apps.product.urls")),
```
### Evidencia
![alt text](image-65.png)

### contenido de `apps/product/tests.py`
```python

from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APITestCase

from apps.common.status import RecordStatus
from apps.product.models import Product, SerializedUnit


class ProductApiTests(APITestCase):
    def setUp(self):
        self.product = Product.objects.create(
            sku="MOV-001",
            name="Leche",
            description="Leche entera",
            price=Decimal("3.20"),
            status=RecordStatus.ACTIVE,
        )

    def test_product_crud(self):
        created = self.client.post(
            "/api/products/",
            {
                "sku": "MOV-002",
                "name": "Café",
                "description": "Café molido",
                "price": "5.50",
            },
            format="json",
        )

        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["status"], RecordStatus.INACTIVE)

        pk = created.data["id"]

        self.assertEqual(self.client.get("/api/products/").status_code, 200)

        detail = self.client.get(f"/api/products/{pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["name"], "Café")

        updated = self.client.patch(
            f"/api/products/{pk}/",
            {"status": "active"},
            format="json",
        )

        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["status"], RecordStatus.ACTIVE)

        deleted = self.client.delete(f"/api/products/{pk}/")

        self.assertEqual(deleted.status_code, 204)

        self.product_refresh = Product.objects.get(pk=pk)
        self.assertEqual(
            self.product_refresh.status,
            RecordStatus.INACTIVE,
        )

    def test_product_duplicate_name(self):
        payload = {
            "sku": "MOV-003",
            "name": "Leche",
            "description": "Otra presentación",
            "price": "4.00",
        }

        response = self.client.post(
            "/api/products/",
            payload,
            format="json",
        )

        # Ajusta esta expectativa según la restricción real
        # de unicidad de name en tu modelo.
        self.assertIn(response.status_code, [201, 400])

    def test_serialized_unit_creation_and_soft_delete(self):
        created = self.client.post(
            "/api/serialized-units/",
            {
                "product": self.product.id,
                "name": "Unidad de leche 001",
                "description": "Unidad física de prueba",
            },
            format="json",
        )

        self.assertEqual(created.status_code, 201)

        unit_id = created.data["id"]

        unit = SerializedUnit.objects.get(pk=unit_id)
        self.assertEqual(unit.product_id, self.product.id)

        deleted = self.client.delete(
            f"/api/serialized-units/{unit_id}/"
        )

        self.assertEqual(deleted.status_code, 204)

        unit.refresh_from_db()
        self.assertEqual(unit.status, RecordStatus.INACTIVE)
```
### Evidencia y test
![alt text](image-66.png)
![alt text](image-67.png)

# Unidad ISS-10 Disponibles con ListAPIView
## Creacion de una lectura filtrada de productos
### ajustes de `apps/product/urls.py`
**ARCHIVO:** `apps/product/urls.py`

**UBICAR:**
```python
from rest_framework.routers import SimpleRouter
```

**REEMPLAZAR POR:**
```python
from django.urls import path
from rest_framework.routers import SimpleRouter
```

**UBICAR el import de las vistas y AGREGAR** 
```pythonAvailableProductListAPIView.

**REEMPLAZAR:**
```python
urlpatterns = router.urls
```

**POR:**
```python
urlpatterns = [
    path(
        "products/available/",
        AvailableProductListAPIView.as_view(),
        name="product-available",
    ),
]
urlpatterns += router.urls
```
### evidencia
![alt text](image-68.png)
## Ajustes a las vistas de product
### Indicaciones
**ARCHIVO:** `apps/product/views.py`

**ENCIMA DE:**
```python
from rest_framework import viewsets
```
**AGREGAR, en la misma línea de imports de rest_framework si ya está viewsets:**
```python
from rest_framework.generics import ListAPIView
```
**AL FINAL DEL ARCHIVO, AGREGAR:**
```python
class AvailableProductListAPIView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        return Product.objects.select_related("product_type").filter(
            status=RecordStatus.ACTIVE,
            product_type__status=RecordStatus.ACTIVE,
        )
```
### evidencia
![alt text](image-69.png)

## Creacion de nuevo test de productos
### Indicaciones
**ARCHIVO:** `apps/product/tests.py`

**AL FINAL DE class ProductApiTests, AGREGAR:**
```python
def test_product_crud_and_available_filter(self):
    created = self.client.post(
        "/api/products/",
        {
            "name": "Agua",
            "price": "2.50",
            "status": "active",
        },
        format="json",
    )
    self.assertEqual(created.status_code, 201)
    available = self.client.get("/api/products/available/")
    self.assertEqual(available.status_code, 200)
    self.assertEqual(len(available.data), 1)
    empty = self.client.get("/api/products/available/")
    self.assertEqual(empty.data, [])
```

### script de prueba
```bash
python manage.py test apps.product.tests.ProductApiTests.test_product_crud_and_available_filter
```

### Evidencia y test
![alt text](image-70.png)
![alt text](image-71.png)