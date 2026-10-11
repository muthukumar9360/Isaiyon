import json
import time
import internetarchive as ia

creds = json.load(open("scripts/ia_config.json"))
session = ia.get_session({
    "s3": {
        "access": creds["access_key"],
        "secret": creds["secret_key"]
    }
})

item = session.get_item("muthuramalingam_a-vault")

files = {
    "Yaaradi_Nee_Mohini/Venmegam/Venmegam.webp": "scripts/downloads/test.webp",
    "Unnai_Ninaithu/Ennai_Thaalattum/Ennai_Thaalattum.mp4": "scripts/downloads/yexxAr8A1_A.mp4",
    "Unnai_Ninaithu/Ennai_Thaalattum/Ennai_Thaalattum.webp": "scripts/downloads/yexxAr8A1_A.webp"
}

meta = {
    "title": "Isaiyon Music Vault - Master Collection",
    "mediatype": "audio",
    "creator": "Muthuramalingam A",
    "collection": "opensource_audio"
}

print("Starting upload to muthuramalingam_a-vault...")
success = False
for attempt in range(1, 4):
    try:
        print(f"Attempt {attempt}...")
        r = item.upload(files, metadata=meta, verbose=True, retries=5)
        print("Upload responses:", [resp.status_code for resp in r])
        success = True
        break
    except Exception as e:
        print(f"Error on attempt {attempt}: {e}")
        time.sleep(3)

if success:
    print("ALL FILES UPLOADED SUCCESSFULLY TO muthuramalingam_a-vault!")
