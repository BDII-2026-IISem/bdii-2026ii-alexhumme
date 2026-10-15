import hashlib
import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from apps.common.status import RecordStatus
from apps.security.models import RefreshToken
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
