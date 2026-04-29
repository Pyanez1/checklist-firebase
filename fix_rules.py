"""
Actualiza las reglas de Firestore a allow read, write: if true
via Firebase Rules REST API usando la service account.
"""
import json, sys, requests
from google.oauth2 import service_account
import google.auth.transport.requests

SA_FILE    = r"C:\Users\pyanez1\Downloads\checklist-completitud-firebase-adminsdk-fbsvc-9130bf7e95.json"
PROJECT    = "checklist-completitud"
SCOPES     = ["https://www.googleapis.com/auth/cloud-platform",
              "https://www.googleapis.com/auth/firebase"]
PROXIES    = {"http":"http://sysproxy.wal-mart.com:8080",
              "https":"http://sysproxy.wal-mart.com:8080"}

RULES_SOURCE = """
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
""".strip()

def get_token():
    creds = service_account.Credentials.from_service_account_file(SA_FILE, scopes=SCOPES)
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token

def fix_rules():
    print("[1] Obteniendo token...")
    token = get_token()
    hdrs  = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Crear nuevo ruleset
    print("[2] Creando ruleset permisivo...")
    url_rs = f"https://firebaserules.googleapis.com/v1/projects/{PROJECT}/rulesets"
    body   = {"source": {"files": [{"name": "firestore.rules", "content": RULES_SOURCE}]}}
    r = requests.post(url_rs, headers=hdrs, json=body, proxies=PROXIES, verify=False)
    r.raise_for_status()
    ruleset_name = r.json()["name"]
    print(f"   Ruleset: {ruleset_name}")

    # Aplicar al release de Firestore
    print("[3] Aplicando reglas a Firestore...")
    url_rel = f"https://firebaserules.googleapis.com/v1/projects/{PROJECT}/releases/cloud.firestore"
    body2   = {"release": {"name": f"projects/{PROJECT}/releases/cloud.firestore",
                           "rulesetName": ruleset_name}}
    r2 = requests.patch(url_rel, headers=hdrs, json=body2, proxies=PROXIES, verify=False)

    if r2.status_code == 404:
        # Si no existe el release, lo crea
        print("   Release no existe, creando...")
        url_rels = f"https://firebaserules.googleapis.com/v1/projects/{PROJECT}/releases"
        r2 = requests.post(url_rels, headers=hdrs, json=body2["release"],
                           proxies=PROXIES, verify=False)

    r2.raise_for_status()
    print()
    print("=" * 55)
    print("  OK Reglas de Firestore actualizadas!")
    print("  allow read, write: if true")
    print("  El checklist deberia funcionar ahora.")
    print("=" * 55)

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings()
    try:
        fix_rules()
    except Exception as e:
        print(f"\nERROR: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print("Detalle:", e.response.text[:500])
        sys.exit(1)
