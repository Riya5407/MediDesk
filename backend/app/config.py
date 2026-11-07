from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/medidesk"
    DATABASE_URL_TEST: str = "postgresql://user:password@localhost:5432/medidesk_test"
    LOW_STOCK_THRESHOLD: int = 20
    EXPIRY_WARNING_DAYS: int = 30
    PAYMENT_MODES: str = "Cash,Card,UPI"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,https://medi-deck.vercel.app"

    # Environment mode (development / production)
    ENVIRONMENT: str = "development"
    FORWARDED_ALLOW_IPS: str = "*"

    # Authentication & JWT
    AUTH_ENABLED: bool = True
    JWT_SECRET: str = "medideck-super-secret-jwt-key-change-in-production-123456"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    COOKIE_SECURE: bool = False

    # Predefined user accounts (Argon2id hashes)
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD_HASH: str = "$argon2id$v=19$m=65536,t=3,p=4$6tr/dm1Ktsw0wI81pvKOig$dfNBHjfWmjZ7zgT72QAS9N+NQuZnPj5HSEXX8uV9lwU"

    PHARMACIST_USERNAME: str = "pharmacist"
    PHARMACIST_PASSWORD_HASH: str = "$argon2id$v=19$m=65536,t=3,p=4$30L03Zr8nEq06P4elF5yRw$CHK1v2PS61MsbX0Wl/pgIKed/kqFSFpiZ4M7/X5iMTQ"

    CASHIER_USERNAME: str = "cashier"
    CASHIER_PASSWORD_HASH: str = "$argon2id$v=19$m=65536,t=3,p=4$muAGHi4jVdyWE/ipf6i8iw$XDE4jLyvrcuKltCTgg+MEfmyJAUD6NAjB2S+WHWDpWk"

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        """Ensure production environment does not silently fall back to demo credentials or secrets."""
        is_prod = self.ENVIRONMENT.lower() in ("production", "prod")
        if is_prod and not self.AUTH_ENABLED:
            raise ValueError(
                "Production configuration error: AUTH_ENABLED cannot be false in production."
            )
        if self.AUTH_ENABLED and is_prod:
            demo_jwt = "medideck-super-secret-jwt-key-change-in-production-123456"
            demo_admin_hash = "$argon2id$v=19$m=65536,t=3,p=4$6tr/dm1Ktsw0wI81pvKOig$dfNBHjfWmjZ7zgT72QAS9N+NQuZnPj5HSEXX8uV9lwU"
            demo_pharm_hash = "$argon2id$v=19$m=65536,t=3,p=4$30L03Zr8nEq06P4elF5yRw$CHK1v2PS61MsbX0Wl/pgIKed/kqFSFpiZ4M7/X5iMTQ"
            demo_cashier_hash = "$argon2id$v=19$m=65536,t=3,p=4$muAGHi4jVdyWE/ipf6i8iw$XDE4jLyvrcuKltCTgg+MEfmyJAUD6NAjB2S+WHWDpWk"

            if self.JWT_SECRET == demo_jwt or len(self.JWT_SECRET) < 32:
                raise ValueError(
                    "Production configuration error: JWT_SECRET must be explicitly set to a unique, random string of at least 32 characters in production."
                )
            if self.ADMIN_PASSWORD_HASH == demo_admin_hash:
                raise ValueError(
                    "Production configuration error: ADMIN_PASSWORD_HASH cannot use the default demo password hash in production. Generate a secure hash using python scripts/hash_password.py."
                )
            if self.PHARMACIST_PASSWORD_HASH == demo_pharm_hash:
                raise ValueError(
                    "Production configuration error: PHARMACIST_PASSWORD_HASH cannot use the default demo password hash in production. Generate a secure hash using python scripts/hash_password.py."
                )
            if self.CASHIER_PASSWORD_HASH == demo_cashier_hash:
                raise ValueError(
                    "Production configuration error: CASHIER_PASSWORD_HASH cannot use the default demo password hash in production. Generate a secure hash using python scripts/hash_password.py."
                )
        return self

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
