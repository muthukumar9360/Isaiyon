import json
import internetarchive as ia

creds = json.load(open("scripts/ia_config.json"))

item = ia.get_item("perumpatayan-tamil-vault-2026")
print("Target vault: perumpatayan-tamil-vault-2026")
print("Existing files:")
files_to_delete = []
for f in item.files:
    fname = f.get('name')
    print(" -", fname)
    # Don't delete system meta files like *_meta.xml or *_files.xml directly as Archive.org manages them
    if not fname.endswith(('_meta.xml', '_meta.sqlite', '_files.xml', '_archive.torrent')):
        files_to_delete.append(fname)

print(f"\nFiles queued for deletion ({len(files_to_delete)}):", files_to_delete)

for fname in files_to_delete:
    try:
        ia_file = item.get_file(fname)
        resp = ia_file.delete(
            cascade_delete=True,
            access_key=creds["access_key"],
            secret_key=creds["secret_key"],
            verbose=True
        )
        print(f"Deleted {fname}: status {getattr(resp, 'status_code', resp)}")
    except Exception as e:
        print(f"Could not delete {fname}: {e}")

print("Deletion process completed!")
