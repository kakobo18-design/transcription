import os
import json
from base64 import urlsafe_b64encode
from cryptography.fernet import Fernet
from hashlib import sha256
from functions.settings import encoding_key 


# ---🔐 Encryption Helpers --- #

def get_fernet_key():
    key = sha256(encoding_key.encode()).digest()
    return Fernet(urlsafe_b64encode(key))


def encrypt_data(data: dict, encyrpted_file: str):
    f = get_fernet_key()
    data = json.dumps(data).encode()
    encrypted = f.encrypt(data)
    with open(encyrpted_file, "wb") as file:
        file.write(encrypted)
    print("💾 Encrypted secrets saved to local cache")


def decrypt_data(encyrpted_file: str) -> dict:
    if not os.path.exists(encyrpted_file):
        return {}
    
    f = get_fernet_key()
    try:
        with open(encyrpted_file, "rb") as file:
            encrypted_data = file.read()
        decrypted = f.decrypt(encrypted_data)
        print("📂 Encrypted secrets loaded from cache")
        return json.loads(decrypted)
    except Exception as e:
        print(f"❌ Failed to decrypt secrets: {e}")
        return {}