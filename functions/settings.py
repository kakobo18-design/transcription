import os
from dotenv import load_dotenv

load_dotenv(override=True)

encoding_key = os.getenv("fernetkey")

speech_key_code= "speechSoutheastasiaKey"

blob_connection_string_code = "BlobHKConnString"
blob_container_name = "art-central-demo" 

#Key Vault
key_vault = "bsai-key-dev"
encrypted_key_file = "./functions/secrets.enc"

APP_ENV = os.getenv("environment")

time_zone = "Asia/Hong_Kong"
encoding = "UTF-8"

