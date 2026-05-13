from azure.identity import ManagedIdentityCredential, AzureCliCredential
from azure.keyvault.secrets import SecretClient
from functions.encryption import encrypt_data, decrypt_data
from functions.settings import key_vault,encrypted_key_file

def get_credential():
    return AzureCliCredential()

def _fetch_from_azure(secret_name: str) -> str | None:
    print(f"🔄 Fetching '{secret_name}' from Azure Key Vault...")
    
    credential = get_credential()
    
    key_vault_url = f"https://{key_vault}.vault.azure.net"
    client = SecretClient(vault_url=key_vault_url, credential=credential)

    try:
        secret = client.get_secret(secret_name)
        print(f"✅ Secret '{secret_name}' fetched from Azure")
        return secret.value
    except Exception as e:
        print(f"❌ Error fetching '{secret_name}': {e}")
        return None


def fetch_secret(name: str) -> str | None:
    secrets = decrypt_data(encrypted_key_file)

    if name in secrets:
        print(f"📦 Returning cached secret for: '{name}'")
        return secrets[name]

    # Not cached — fetch from Azure
    value = _fetch_from_azure(name)
    if value:
        secrets[name] = value
        encrypt_data(secrets,encrypted_key_file)
    return value