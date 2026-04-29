"""
Deploy directo a Firebase Hosting via REST API.
No requiere Firebase CLI ni Node.js.
"""
import json, hashlib, gzip, os, sys
import requests
import google.auth
import google.auth.transport.requests
from google.oauth2 import service_account
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
SA_FILE   = r"C:\Users\pyanez1\Downloads\checklist-completitud-firebase-adminsdk-fbsvc-9130bf7e95.json"
SITE_ID   = "checklist-completitud"
PUBLIC    = Path(r"C:\Users\pyanez1\Codepuppy\checklist_firebase\public")
BASE_URL  = "https://firebasehosting.googleapis.com/v1beta1"
SCOPES    = ["https://www.googleapis.com/auth/firebase.hosting"]

# Proxy Walmart
PROXIES = {
    "http":  "http://sysproxy.wal-mart.com:8080",
    "https": "http://sysproxy.wal-mart.com:8080",
}

def get_token():
    creds = service_account.Credentials.from_service_account_file(SA_FILE, scopes=SCOPES)
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token

def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

def sha256_gz(path: Path):
    """Retorna (sha256_hex, gzipped_bytes) del archivo."""
    raw = path.read_bytes()
    gz  = gzip.compress(raw)
    h   = hashlib.sha256(gz).hexdigest()
    return h, gz

def deploy():
    print("[1] Obteniendo token...")
    token = get_token()
    h     = headers(token)

    # 1. Crear versión
    print("[2] Creando version...")
    r = requests.post(
        f"{BASE_URL}/sites/{SITE_ID}/versions",
        headers=h,
        json={"config": {"headers": [{"glob": "**", "headers": {"Cache-Control": "no-cache"}}]}},
        proxies=PROXIES, verify=False
    )
    r.raise_for_status()
    version_name = r.json()["name"]
    version_id   = version_name.split("/")[-1]
    print(f"   Versión: {version_id}")

    # 2. Preparar archivos
    files = list(PUBLIC.rglob("*"))
    files = [f for f in files if f.is_file()]
    file_hashes = {}
    gz_data     = {}
    for f in files:
        rel  = "/" + f.relative_to(PUBLIC).as_posix()
        h256, gz = sha256_gz(f)
        file_hashes[rel] = h256
        gz_data[h256]    = gz
        print(f"   {rel} -> {h256[:12]}...")

    # 3. Registrar archivos y obtener URLs de upload
    print("[3] Registrando archivos...")
    r = requests.post(
        f"{BASE_URL}/{version_name}:populateFiles",
        headers=headers(token),
        json={"files": file_hashes},
        proxies=PROXIES, verify=False
    )
    r.raise_for_status()
    data        = r.json()
    upload_url  = data.get("uploadUrl", "")
    required    = data.get("uploadRequiredHashes", [])
    print(f"   Archivos a subir: {len(required)}")

    # 4. Subir archivos requeridos
    for h256 in required:
        print(f"   Subiendo {h256[:12]}...")
        resp = requests.post(
            f"{upload_url}/{h256}",
            headers={"Authorization": f"Bearer {token}",
                     "Content-Type": "application/octet-stream"},
            data=gz_data[h256],
            proxies=PROXIES, verify=False
        )
        resp.raise_for_status()

    # 5. Finalizar versión
    print("[5] Finalizando version...")
    r = requests.patch(
        f"{BASE_URL}/{version_name}",
        headers=headers(token),
        json={"status": "FINALIZED"},
        params={"updateMask": "status"},
        proxies=PROXIES, verify=False
    )
    r.raise_for_status()

    # 6. Crear release
    print("[6] Publicando...")
    r = requests.post(
        f"{BASE_URL}/sites/{SITE_ID}/releases",
        headers=headers(token),
        params={"versionName": version_name},
        proxies=PROXIES, verify=False
    )
    r.raise_for_status()

    print()
    print("=" * 55)
    print("  OK CHECKLIST PUBLICADO EXITOSAMENTE")
    print(f"  🌐 https://{SITE_ID}.web.app")
    print("=" * 55)

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings()
    try:
        deploy()
    except Exception as e:
        print(f"\nERROR: {e}")
        sys.exit(1)
