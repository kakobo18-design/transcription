from datetime import datetime
import os, time, pytz, json
from azure.storage.blob import BlobServiceClient
from functions.settings import blob_connection_string_code, blob_container_name, time_zone, encoding
from functions.azure_keys import fetch_secret
from functions.settings import APP_ENV
from typing import Tuple

def combine_log(data):
    
    
    from pprint import pprint
    pprint(data)
    
    # Sort by timestamp (oldest first)
    data_sorted = sorted(
        data['log_data'],
        key=lambda x: datetime.fromisoformat(x["timestamp"].replace("Z", "+00:00"))
    )

    # Initialize dictionary for combined texts
    combined_dict = {}

    # Always include English (the main `text` field)
    combined_dict["en"] = " ".join(item["text"] for item in data_sorted)

    # Collect all available translation keys
    lang_keys = set()
    for item in data_sorted:
        lang_keys.update(item["translations"].keys())

    # Aggregate each translation language
    for lang in lang_keys:
        combined_dict[lang] = " ".join(item["translations"].get(lang, "") for item in data_sorted)
    
    # Add Timestamps
    combined_dict["day"] = data["day"]
    combined_dict["start_time"] = data["start_time"]
    combined_dict["end_time"] = data["end_time"]
   
    # Save to file
    os.makedirs("./temp", exist_ok=True)
    filename = f"transcription_{APP_ENV}_{int(time.time())}.json"
    filepath = os.path.join("./temp", filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(combined_dict, f, ensure_ascii=False, indent=2)
        
    #file_url = upload_file_to_azure_blob(temp_dir="./temp", fileblob=filename, container_name=blob_container_name)  
    
    #os.remove(filepath)  
    #print(f"✅ Saved combined JSON to {file_url }")
    #return file_url

def upload_file_to_azure_blob(temp_dir, fileblob, container_name):
    
    container_folder = "transcriptions"
    blob_connection_string= fetch_secret(blob_connection_string_code)
    blob_service_client = BlobServiceClient.from_connection_string(blob_connection_string)
    blob_container_client = blob_service_client.get_container_client(blob_container_name)
    
    fileblob_path = os.path.join(temp_dir,fileblob)

    with open(fileblob_path, "rb") as data:
        blob_container_client.upload_blob(name=fileblob, data=data, overwrite=True)
    
    # Construct the blob URL
    blob_file_url = f"https://{blob_service_client.account_name}.blob.core.windows.net/{container_name}/{fileblob}"
    
    return blob_file_url

def create_time_stamps() -> Tuple[str, str, str]:
    """
    Generate the current day, time, and timezone string
    based on the configured global timezone.

    Returns:
        A tuple of (day, time, timezone),
        e.g. ('12-Nov-2025', '18:45:23', 'Asia/Hong_Kong')
    """
    timezone = time_zone
    tz = pytz.timezone(timezone)

    day= datetime.now(tz).strftime('%d-%b-%Y')
    time_str = datetime.now(tz).strftime('%H:%M:%S')

    return day, time_str, timezone