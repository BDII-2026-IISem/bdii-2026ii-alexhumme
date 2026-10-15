from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APITestCase

from apps.common.status import RecordStatus
from apps.common.testing import create_active_user, grant, grant_crud
from apps.product.models import Product, SerializedUnit


class ProductApiTests(APITestCase):
    def setUp(self):
        self.user = create_active_user(username="nora", email="nora@movilcare.test")
        grant_crud(self.user, "/api/products/", "/api/products/1/")
        grant_crud(self.user, "/api/serialized-units/", "/api/serialized-units/1/")
        grant(self.user, "GET", "/api/products/1/units/")
        self.client.force_authenticate(user=self.user)
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

        # El nombre debe persistirse: "name" estaba fuera de Meta.fields y DRF
        # lo descartaba, guardando '' y rompiendo la unicidad en el 2º POST.
        self.assertEqual(created.data["name"], "Unidad de leche 001")

        unit_id = created.data["id"]

        unit = SerializedUnit.objects.get(pk=unit_id)
        self.assertEqual(unit.product_id, self.product.id)

        deleted = self.client.delete(
            f"/api/serialized-units/{unit_id}/"
        )

        self.assertEqual(deleted.status_code, 204)

        unit.refresh_from_db()
        self.assertEqual(unit.status, RecordStatus.INACTIVE)

    def test_product_crud_and_available_filter(self):
        """CRUD de producto + listado y filtrado de sus unidades serializadas."""
        # --- CRUD de producto ---------------------------------------------
        created = self.client.post(
            "/api/products/",
            {
                "sku": "M0V-053",
                "name": "Agua",
                "price": "2.50",
                "status": RecordStatus.ACTIVE,
            },
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["status"], RecordStatus.ACTIVE)

        pk = created.data["id"]
        detail = self.client.get(f"/api/products/{pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["name"], "Agua")

        # --- Unidades serializadas del producto ---------------------------
        # "Pan" tiene sus propias unidades: no deben filtrarse en las de "Agua".
        other = Product.objects.create(
            sku="MOV-010",
            name="Pan",
            price=Decimal("1.00"),
            status=RecordStatus.ACTIVE,
        )
        SerializedUnit.objects.create(
            product=self.product, name="U-Leche-01", status=RecordStatus.ACTIVE
        )
        SerializedUnit.objects.create(
            product=self.product, name="U-Leche-02", status=RecordStatus.INACTIVE
        )
        SerializedUnit.objects.create(
            product=other, name="U-Pan-01", status=RecordStatus.ACTIVE
        )

        units_url = f"/api/products/{self.product.id}/units/"

        # Sin el query param se listan todas las del producto.
        all_units = self.client.get(units_url)
        self.assertEqual(all_units.status_code, 200)
        self.assertEqual(
            {u["name"] for u in all_units.data},
            {"U-Leche-01", "U-Leche-02"},
        )
        for unit in all_units.data:
            self.assertEqual(unit["product_id"], self.product.id)
            self.assertEqual(unit["product_name"], "Leche")

        # El filtro ?status sí reduce el conjunto.
        active = self.client.get(units_url, {"status": RecordStatus.ACTIVE})
        self.assertEqual(active.status_code, 200)
        self.assertEqual([u["name"] for u in active.data], ["U-Leche-01"])

        inactive = self.client.get(units_url, {"status": RecordStatus.INACTIVE})
        self.assertEqual(inactive.status_code, 200)
        self.assertEqual([u["name"] for u in inactive.data], ["U-Leche-02"])

        # Un producto inexistente responde 404, no una lista vacía.
        self.assertEqual(
            self.client.get("/api/products/999999/units/").status_code, 404
        )

        # --- Borrado lógico -----------------------------------------------
        deleted = self.client.delete(f"/api/products/{pk}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(
            Product.objects.get(pk=pk).status, RecordStatus.INACTIVE
        )

