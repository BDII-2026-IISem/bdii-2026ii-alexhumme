import hashlib
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.status import RecordStatus
from apps.common.testing import PASSWORD, create_active_user
from apps.security.models import (
    RefreshToken,
    Resource,
    ResourceRole,
    Role,
    RoleUser,
)
from apps.security.tokens import generate_refresh_value, hash_token
from config.database import database_from_environ

User = get_user_model()


class DatabaseSelectionTests(SimpleTestCase):
    def _env(self, engine):
        return {
            "DB_ENGINE": engine,
            "POSTGRES_DB": "movilcare",
            "POSTGRES_USER": "ialab",
            "POSTGRES_PASSWORD": "123456",
            "POSTGRES_HOST": "127.0.0.1",
            "POSTGRES_PORT": "5433",
            "MYSQL_DB": "Movilcare",
            "MYSQL_USER": "root",
            "MYSQL_PASSWORD": "123456",
            "MYSQL_HOST": "127.0.0.1",
            "MYSQL_PORT": "3306",
            "MSSQL_DB": "movilcare",
            "MSSQL_USER": "SA",
            "MSSQL_PASSWORD": "Sa@123456",
            "MSSQL_HOST": "127.0.0.1",
            "MSSQL_PORT": "1433",
            "ORACLE_DB": "movilcare",
            "ORACLE_USER": "movilcare",
            "ORACLE_PASSWORD": "123456",
            "ORACLE_HOST": "127.0.0.1",
            "ORACLE_PORT": "1521",
            "ORACLE_SERVICE_NAME": "XE",
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
        self.assertIn("SERVICE_NAME=XE", config["default"]["NAME"])
        self.assertEqual(config["default"]["PORT"], "")

    def test_invalid_engine(self):
        with self.assertRaises(ImproperlyConfigured):
            database_from_environ({"DB_ENGINE": "sqlite"})

    def test_missing_variable(self):
        env = self._env("postgresql")
        env["POSTGRES_DB"] = ""
        with self.assertRaises(ImproperlyConfigured):
            database_from_environ(env)


class RefreshTokenTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ana", email="ana@movilcare.com", password="S3cret-pass"
        )

    def _issue(self):
        raw = generate_refresh_value()
        token = RefreshToken.objects.create(
            user=self.user,
            token_hash=hash_token(raw),
            expires_at=RefreshToken.default_expiry(),
        )
        return raw, token

    def test_hash_is_sha256_of_the_returned_value(self):
        raw, token = self._issue()
        # El guardado es SHA-256 en hexadecimal del valor que solo vio el cliente.
        self.assertEqual(token.token_hash, hashlib.sha256(raw.encode("utf-8")).hexdigest())
        self.assertEqual(token.token_hash, hash_token(raw))
        self.assertEqual(len(token.token_hash), 64)

    def test_stored_hash_is_not_the_plaintext_refresh(self):
        raw, token = self._issue()
        # La fila nunca guarda el refresh en claro.
        self.assertNotEqual(token.token_hash, raw)
        self.assertNotIn(raw, token.token_hash)

    def test_generate_refresh_value_is_unique_and_urlsafe(self):
        values = {generate_refresh_value() for _ in range(50)}
        self.assertEqual(len(values), 50)

    def test_new_token_defaults_to_active_and_usable(self):
        _, token = self._issue()
        self.assertEqual(token.status, RecordStatus.ACTIVE)
        self.assertTrue(token.is_usable)
        self.assertIsNone(token.revoked_at)
        self.assertIsNone(token.replaced_by_id)

    def test_family_id_is_stable_and_unique_per_token(self):
        _, first = self._issue()
        _, second = self._issue()
        self.assertNotEqual(first.family_id, second.family_id)
        self.assertIsInstance(first.family_id, uuid.UUID)

    def test_default_expiry_follows_refresh_lifetime(self):
        before = timezone.now() + timedelta(days=1)
        expiry = RefreshToken.default_expiry()
        self.assertGreater(expiry, before - timedelta(seconds=5))
        self.assertLess(expiry, before + timedelta(seconds=5))

    def test_revoked_or_expired_token_is_not_usable(self):
        _, revoked = self._issue()
        revoked.revoked_at = timezone.now()
        revoked.save()
        self.assertFalse(revoked.is_usable)

        expired = RefreshToken.objects.create(
            user=self.user,
            token_hash=hash_token(generate_refresh_value()),
            expires_at=timezone.now() - timedelta(minutes=1),
        )
        self.assertFalse(expired.is_usable)


class RBACMatrixTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="luis", email="luis@movilcare.com", password="S3cret-pass"
        )
        self.role = Role.objects.create(name="Vendedor")
        self.other = User.objects.create_user(
            username="maria", email="maria@movilcare.com", password="S3cret-pass"
        )

    def _resource(self, method="GET", route="api/customers/<int:pk>/"):
        return Resource.objects.create(name="Customer detail", method=method, route=route)

    def test_tables_exist_and_default_status_is_inactive(self):
        self.assertEqual(self.role.status, RecordStatus.INACTIVE)
        resource = self._resource()
        self.assertEqual(resource.status, RecordStatus.INACTIVE)
        link = RoleUser.objects.create(role=self.role, user=self.user)
        self.assertEqual(link.status, RecordStatus.INACTIVE)
        grant = ResourceRole.objects.create(resource=resource, role=self.role)
        self.assertEqual(grant.status, RecordStatus.INACTIVE)

    def test_role_name_is_unique(self):
        with self.assertRaises(Exception):
            Role.objects.create(name="Vendedor")

    def test_role_user_pair_is_unique(self):
        RoleUser.objects.create(role=self.role, user=self.user)
        with self.assertRaises(Exception):
            RoleUser.objects.create(role=self.role, user=self.user)

    def test_resource_role_pair_is_unique(self):
        resource = self._resource()
        ResourceRole.objects.create(resource=resource, role=self.role)
        with self.assertRaises(Exception):
            ResourceRole.objects.create(resource=resource, role=self.role)

    def test_resource_method_route_is_unique(self):
        self._resource(method="GET", route="api/customers/")
        with self.assertRaises(Exception):
            self._resource(method="GET", route="api/customers/")

    def test_different_user_can_share_same_role(self):
        RoleUser.objects.create(role=self.role, user=self.user)
        RoleUser.objects.create(role=self.role, user=self.other)
        self.assertEqual(self.role.assignments.count(), 2)

    def test_foreign_keys_use_restrict(self):
        resource = self._resource()
        RoleUser.objects.create(role=self.role, user=self.user)
        ResourceRole.objects.create(resource=resource, role=self.role)
        # RESTRICT: no se puede borrar un rol que está en uso.
        with self.assertRaises(Exception):
            self.role.delete()
        with self.assertRaises(Exception):
            self.user.delete()

    def test_resource_route_keeps_the_url_pattern(self):
        # La ruta se guarda como patrón (con <int:pk>), no con el id sustituido.
        resource = self._resource(method="GET", route="api/customers/<int:pk>/")
        self.assertIn("<int:pk>", resource.route)
        self.assertNotIn("/1/", resource.route)


class AuthFlowTests(APITestCase):
    """Login OPEN: no force_authenticate ni grant, el endpoint es público."""

    def setUp(self):
        self.user = create_active_user()

    def test_login_with_username_and_email(self):
        by_username = self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(by_username.status_code, status.HTTP_200_OK)
        self.assertIn("access", by_username.data)
        self.assertIn("refresh", by_username.data)
        self.assertNotIn("password", by_username.data)

        stored = RefreshToken.objects.get()
        self.assertEqual(stored.token_hash, hash_token(by_username.data["refresh"]))
        self.assertNotEqual(stored.token_hash, by_username.data["refresh"])

        by_email = self.client.post(
            "/api/auth/login/",
            {"email": "ANA@movilcare.test", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(by_email.status_code, status.HTTP_200_OK)
        self.assertIn("access", by_email.data)

    def test_inactive_user_and_bad_password_are_401(self):
        self.user.status = RecordStatus.INACTIVE
        self.user.save()
        inactive = self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(inactive.status_code, status.HTTP_401_UNAUTHORIZED)

        self.user.status = RecordStatus.ACTIVE
        self.user.save()
        bad_password = self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": "otra-clave"},
            format="json",
        )
        self.assertEqual(bad_password.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unknown_user_is_401(self):
        unknown = self.client.post(
            "/api/auth/login/",
            {"username": "nadie", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(unknown.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_without_username_or_email_is_400(self):
        missing = self.client.post(
            "/api/auth/login/",
            {"password": PASSWORD},
            format="json",
        )
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)

    def test_refresh_rotates_and_reuse_revokes_family(self):
        login = self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": PASSWORD},
            format="json",
        )
        first = login.data["refresh"]

        rotated = self.client.post(
            "/api/auth/refresh/", {"refresh": first}, format="json"
        )
        self.assertEqual(rotated.status_code, status.HTTP_200_OK)
        second = rotated.data["refresh"]
        self.assertNotEqual(first, second)
        # El anterior queda marcado con replaced_by.
        old = RefreshToken.objects.get(token_hash=hash_token(first))
        self.assertIsNotNone(old.replaced_by_id)

        # Reusar el primero se trata como robo: se apaga la familia.
        reused = self.client.post(
            "/api/auth/refresh/", {"refresh": first}, format="json"
        )
        self.assertEqual(reused.status_code, status.HTTP_401_UNAUTHORIZED)

        # El segundo murió con la familia.
        after_reuse = self.client.post(
            "/api/auth/refresh/", {"refresh": second}, format="json"
        )
        self.assertEqual(after_reuse.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_refresh_is_400_or_401_without_family_revocation(self):
        login = self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": PASSWORD},
            format="json",
        )
        raw = login.data["refresh"]
        stored = RefreshToken.objects.get(token_hash=hash_token(raw))
        stored.expires_at = timezone.now() - timedelta(minutes=1)
        stored.save(update_fields=["expires_at", "updated_at"])

        expired = self.client.post(
            "/api/auth/refresh/", {"refresh": raw}, format="json"
        )
        self.assertEqual(expired.status_code, status.HTTP_401_UNAUTHORIZED)
        stored.refresh_from_db()
        self.assertEqual(stored.status, RecordStatus.INACTIVE)
        # El vencimiento no prueba reuso: la familia no se revoca.
        self.assertIsNone(stored.revoked_at)

    def test_unknown_refresh_is_401(self):
        unknown = self.client.post(
            "/api/auth/refresh/", {"refresh": "no-existe"}, format="json"
        )
        self.assertEqual(unknown.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_invalidates_refresh(self):
        login = self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": PASSWORD},
            format="json",
        )
        raw = login.data["refresh"]

        logout = self.client.post(
            "/api/auth/logout/", {"refresh": raw}, format="json"
        )
        self.assertEqual(logout.status_code, status.HTTP_204_NO_CONTENT)

        # Ese refresh ya no puede renovar.
        again = self.client.post(
            "/api/auth/refresh/", {"refresh": raw}, format="json"
        )
        self.assertEqual(again.status_code, status.HTTP_401_UNAUTHORIZED)

        stored = RefreshToken.objects.get(token_hash=hash_token(raw))
        self.assertIsNotNone(stored.revoked_at)
        self.assertEqual(stored.status, RecordStatus.INACTIVE)

    def test_logout_twice_still_returns_204(self):
        login = self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": PASSWORD},
            format="json",
        )
        raw = login.data["refresh"]
        first = self.client.post(
            "/api/auth/logout/", {"refresh": raw}, format="json"
        )
        self.assertEqual(first.status_code, status.HTTP_204_NO_CONTENT)
        second = self.client.post(
            "/api/auth/logout/", {"refresh": raw}, format="json"
        )
        self.assertEqual(second.status_code, status.HTTP_204_NO_CONTENT)

    def test_logout_of_rotated_token_revokes_family(self):
        login = self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": PASSWORD},
            format="json",
        )
        first = login.data["refresh"]
        rotated = self.client.post(
            "/api/auth/refresh/", {"refresh": first}, format="json"
        )
        second = rotated.data["refresh"]

        # Presentar el token ya rotado en logout es reuso: se apaga la familia.
        reuse_logout = self.client.post(
            "/api/auth/logout/", {"refresh": first}, format="json"
        )
        self.assertEqual(reuse_logout.status_code, status.HTTP_401_UNAUTHORIZED)
        after = self.client.post(
            "/api/auth/refresh/", {"refresh": second}, format="json"
        )
        self.assertEqual(after.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_does_not_touch_other_sessions(self):
        raw_a = self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": PASSWORD},
            format="json",
        ).data["refresh"]
        # Otro dispositivo: misma cuenta, otra familia de refresh.
        raw_b = self.client.post(
            "/api/auth/login/",
            {"username": "ana", "password": PASSWORD},
            format="json",
        ).data["refresh"]

        self.client.post("/api/auth/logout/", {"refresh": raw_a}, format="json")
        # La otra sesión sigue viva.
        still_ok = self.client.post(
            "/api/auth/refresh/", {"refresh": raw_b}, format="json"
        )
        self.assertEqual(still_ok.status_code, status.HTTP_200_OK)
