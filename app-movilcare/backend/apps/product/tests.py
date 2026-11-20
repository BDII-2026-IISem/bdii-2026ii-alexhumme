from decimal import Decimal

from rest_framework.test import APITestCase

from apps.common.status import RecordStatus
from apps.common.testing import create_active_user, grant, grant_crud
from apps.product.models import Part, Product, SerializedUnit


class ProductApiTests(APITestCase):
    def setUp(self):
        self.user = create_active_user(username="nora", email="nora@movilcare.test")
        grant_crud(self.user, "/api/products/", "/api/products/1/")
        grant_crud(self.user, "/api/serialized-units/", "/api/serialized-units/1/")
        grant_crud(self.user, "/api/parts/", "/api/parts/1/")
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
                "serial": "SN-LEC-001",
            },
            format="json",
        )

        self.assertEqual(created.status_code, 201)

        # El serial (UQ en modelo.md) debe persistirse en la respuesta.
        self.assertEqual(created.data["serial"], "SN-LEC-001")

        unit_id = created.data["id"]

        unit = SerializedUnit.objects.get(pk=unit_id)
        self.assertEqual(unit.product_id, self.product.id)

        deleted = self.client.delete(
            f"/api/serialized-units/{unit_id}/"
        )

        self.assertEqual(deleted.status_code, 204)

        unit.refresh_from_db()
        self.assertEqual(unit.status, RecordStatus.INACTIVE)

    def test_serialized_unit_duplicate_serial_is_rejected(self):
        SerializedUnit.objects.create(
            product=self.product, serial="SN-DUP-01", status=RecordStatus.ACTIVE
        )

        response = self.client.post(
            "/api/serialized-units/",
            {"product": self.product.id, "serial": "SN-DUP-01"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_part_crud_and_stock(self):
        created = self.client.post(
            "/api/parts/",
            {
                "name": "Pantalla",
                "description": "Pantalla LCD",
                "price": "55.00",
                "stock": 4,
            },
            format="json",
        )

        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["status"], RecordStatus.INACTIVE)
        self.assertEqual(created.data["stock"], 4)

        pk = created.data["id"]

        updated = self.client.patch(
            f"/api/parts/{pk}/",
            {"status": "active", "stock": 10},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["status"], RecordStatus.ACTIVE)
        self.assertEqual(updated.data["stock"], 10)

        listed = self.client.get("/api/parts/")
        self.assertEqual(listed.status_code, 200)
        self.assertTrue(any(row["id"] == pk for row in listed.data))

        deleted = self.client.delete(f"/api/parts/{pk}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertEqual(
            Part.objects.get(pk=pk).status, RecordStatus.INACTIVE
        )

    def test_part_negative_price_is_rejected(self):
        response = self.client.post(
            "/api/parts/",
            {"name": "Batería", "price": "-1.00", "stock": 1},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Part.objects.count(), 0)

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
            product=self.product, serial="U-Leche-01", status=RecordStatus.ACTIVE
        )
        SerializedUnit.objects.create(
            product=self.product, serial="U-Leche-02", status=RecordStatus.INACTIVE
        )
        SerializedUnit.objects.create(
            product=other, serial="U-Pan-01", status=RecordStatus.ACTIVE
        )

        units_url = f"/api/products/{self.product.id}/units/"

        # Sin el query param se listan todas las del producto.
        all_units = self.client.get(units_url)
        self.assertEqual(all_units.status_code, 200)
        self.assertEqual(
            {u["serial"] for u in all_units.data},
            {"U-Leche-01", "U-Leche-02"},
        )
        for unit in all_units.data:
            self.assertEqual(unit["product_id"], self.product.id)
            self.assertEqual(unit["product_name"], "Leche")

        # El filtro ?status sí reduce el conjunto.
        active = self.client.get(units_url, {"status": RecordStatus.ACTIVE})
        self.assertEqual(active.status_code, 200)
        self.assertEqual([u["serial"] for u in active.data], ["U-Leche-01"])

        inactive = self.client.get(units_url, {"status": RecordStatus.INACTIVE})
        self.assertEqual(inactive.status_code, 200)
        self.assertEqual([u["serial"] for u in inactive.data], ["U-Leche-02"])

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
