import json

from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.status import RecordStatus
from apps.common.testing import create_active_user, grant_crud
from apps.customer.models import Customer


class CustomerApiTests(APITestCase):
    def setUp(self):
        self.user = create_active_user()
        grant_crud(self.user, "/api/customers/", "/api/customers/1/")
        self.client.force_authenticate(user=self.user)

    def test_create_defaults_and_persists(self):
        response = self.client.post(
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
        invalid = self.client.post("/api/customers/", {"name": "A"}, format="json")
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.client.post(
            "/api/customers/",
            {"name": "Ana Ruiz", "email": "ana@example.com"},
            format="json",
        )
        duplicate = self.client.post(
            "/api/customers/",
            {"name": "Otra Ana", "email": "ana@example.com"},
            format="json",
        )
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)

    def test_soft_delete_keeps_the_row(self):
        created = self.client.post("/api/customers/", {"name": "Pedro León"}, format="json")
        deleted = self.client.delete(f"/api/customers/{created.data['id']}/")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        stored = Customer.objects.get(pk=created.data["id"])
        self.assertEqual(stored.status, RecordStatus.INACTIVE)
        self.assertEqual(Customer.objects.count(), 1)

    def test_list_retrieve_and_update(self):
        created = self.client.post(
            "/api/customers/",
            {"name": "Luisa Mora", "phone": "111"},
            format="json",
        )
        pk = created.data["id"]
        listed = self.client.get("/api/customers/")
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        detail = self.client.get(f"/api/customers/{pk}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["name"], "Luisa Mora")
        updated = self.client.patch(
            f"/api/customers/{pk}/",
            {"phone": "222", "status": "active"},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["status"], "active")

    def test_missing_grant_is_403_and_missing_identity_is_401(self):
        # Sin identidad → 401.
        self.client.force_authenticate(user=None)
        anonymous = self.client.get("/api/customers/")
        self.assertEqual(anonymous.status_code, status.HTTP_401_UNAUTHORIZED)

        # Con identidad pero sin concesión → 403 (deny by default).
        other = create_active_user(username="sinrol", email="sinrol@movilcare.test")
        self.client.force_authenticate(user=other)
        denied = self.client.get("/api/customers/")
        self.assertEqual(denied.status_code, status.HTTP_403_FORBIDDEN)

        # El usuario con la concesión sigue pasando.
        self.client.force_authenticate(user=self.user)
        allowed = self.client.get("/api/customers/")
        self.assertEqual(allowed.status_code, status.HTTP_200_OK)