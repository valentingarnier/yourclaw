"""Fernet encryption for API keys and gateway tokens."""

from cryptography.fernet import Fernet

from app.config import settings


def get_fernet() -> Fernet:
    """Get Fernet instance with encryption key from settings."""
    if not settings.encryption_key:
        raise ValueError("ENCRYPTION_KEY not set")
    return Fernet(settings.encryption_key.encode())


def encrypt(plaintext: str) -> str:
    """Encrypt a string and return base64-encoded ciphertext."""
    f = get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    """Decrypt base64-encoded ciphertext and return plaintext."""
    f = get_fernet()
    return f.decrypt(ciphertext.encode()).decode()
