#!/usr/bin/env bash
set -uo pipefail
cd /home/alex_vb/ia-lab/projects/bd-2/app-movilcare/backend

cat > _tmp_t2.py <<'PYEOF'
from decimal import Decimal
from django.test import Client
from django.test.utils import setup_test_environment, teardown_test_environment
from django.test.runner import DiscoverRunner
from django.db import transaction
from apps.common.status import RecordStatus
from apps.product.models import Product, SerializedUnit

setup_test_environment()
runner = DiscoverRunner(verbosity=0, interactive=False)
old = runner.setup_databases()
try:
    with transaction.atomic():
        p1 = Product.objects.create(sku="P1", name="Leche", price=Decimal("3.20"),
                                    status=RecordStatus.ACTIVE)
        p2 = Product.objects.create(sku="P2", name="Pan", price=Decimal("1.00"),
                                    status=RecordStatus.ACTIVE)
        SerializedUnit.objects.create(product=p1, name="U-Leche-01", status=RecordStatus.ACTIVE)
        SerializedUnit.objects.create(product=p1, name="U-Leche-02", status=RecordStatus.INACTIVE)
        SerializedUnit.objects.create(product=p2, name="U-Pan-01", status=RecordStatus.ACTIVE)

    c = Client()

    def show(label, url, query=None):
        r = c.get(url, query or {})
        print(f"=== {label}")
        print(f"    GET {url} -> {r.status_code}")
        if r.status_code == 200:
            for u in r.json():
                print(f"      name={u['name']!r} productId={u['productId']} "
                      f"productName={u['productName']!r} status={u['status']!r}")
        else:
            print("      body:", r.content[:120])
        print()

    show("unidades del producto 1", "/api/products/1/units/")
    show("unidades del producto 2", "/api/products/2/units/")
    show("solo inactivas del producto 1", "/api/products/1/units/", {"status": "inactive"})
    show("producto inexistente (esperado 404)", "/api/products/999/units/")
    show("id no numerico (esperado 404)", "/api/products/abc/units/")

    print("=== Las demas rutas siguen funcionando ===")
    for u in ("/api/products/", "/api/serialized-units/", "/api/products/1/"):
        print(f"    GET {u:30} -> {c.get(u).status_code}")

    print()
    print("=== Número de queries (select_related debe evitar N+1) ===")
    from django.test.utils import CaptureQueriesContext
    from django.db import connection
    SerializedUnit.objects.all().delete()
    with transaction.atomic():
        for i in range(10):
            SerializedUnit.objects.create(product=p1, name=f"U-{i:02d}",
                                          status=RecordStatus.ACTIVE)
    with CaptureQueriesContext(connection) as ctx:
        c.get("/api/products/1/units/")
    print(f"    10 unidades -> {len(ctx.captured_queries)} query(s)")
finally:
    runner.teardown_databases(old)
    teardown_test_environment()
PYEOF
.venv/bin/python manage.py shell -c "exec(open('_tmp_t2.py').read())" 2>&1 | grep -vE 'objects imported'
rm -f _tmp_t2.py _tmp_t.sh
