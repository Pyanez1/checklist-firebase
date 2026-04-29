"""
Crea la base de datos Firestore en Native mode
e inicializa el config de restricciones.
"""
import sys, time, requests
from google.oauth2 import service_account
import google.auth.transport.requests

SA_FILE = r"C:\Users\pyanez1\Downloads\checklist-completitud-firebase-adminsdk-fbsvc-9130bf7e95.json"
PROJECT = "checklist-completitud"
SCOPES  = ["https://www.googleapis.com/auth/cloud-platform",
           "https://www.googleapis.com/auth/datastore"]
PROXIES = {"http":"http://sysproxy.wal-mart.com:8080",
           "https":"http://sysproxy.wal-mart.com:8080"}

def get_token(scopes):
    creds = service_account.Credentials.from_service_account_file(SA_FILE, scopes=scopes)
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token

def fs_str(v):  return {"stringValue": v}
def fs_bool(v): return {"booleanValue": v}
def fs_arr(v):  return {"arrayValue": {"values": v}}
def fs_map(d):  return {"mapValue": {"fields": d}}

def run():
    import urllib3; urllib3.disable_warnings()

    # ── Paso 1: Crear base de datos ─────────────────────────────
    print("[1] Creando base de datos Firestore (Native mode)...")
    token_cp = get_token(["https://www.googleapis.com/auth/cloud-platform"])
    hdrs_cp  = {"Authorization": f"Bearer {token_cp}", "Content-Type": "application/json"}

    r = requests.post(
        f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases",
        headers=hdrs_cp,
        json={"type": "FIRESTORE_NATIVE", "locationId": "southamerica-east1"},
        params={"databaseId": "(default)"},
        proxies=PROXIES, verify=False, timeout=30
    )

    if r.status_code in (200, 201):
        print("   Base de datos creada, esperando propagacion...")
        time.sleep(15)
    elif r.status_code == 409:
        print("   La base de datos ya existe.")
    else:
        print(f"   ERROR {r.status_code}: {r.text[:300]}")
        sys.exit(1)

    # ── Paso 2: Verificar y escribir config ─────────────────────
    print("[2] Escribiendo config de restricciones...")
    token_fs = get_token(["https://www.googleapis.com/auth/datastore"])
    hdrs_fs  = {"Authorization": f"Bearer {token_fs}", "Content-Type": "application/json"}
    DB_BASE  = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"

    config_fields = {
        "restrictions": fs_arr([
            fs_map({"seccion": fs_str("SALA"),   "turno": fs_str("AM"),
                    "hora_inicio": fs_str("07:00"), "hora_fin": fs_str("15:30"),
                    "activo": fs_bool(False)}),
            fs_map({"seccion": fs_str("SALA"),   "turno": fs_str("PM"),
                    "hora_inicio": fs_str("14:30"), "hora_fin": fs_str("22:30"),
                    "activo": fs_bool(False)}),
            fs_map({"seccion": fs_str("SALA"),   "turno": fs_str("NOCHE"),
                    "hora_inicio": fs_str("21:30"), "hora_fin": fs_str("07:30"),
                    "activo": fs_bool(False)}),
            fs_map({"seccion": fs_str("BODEGA"), "turno": fs_str("AM"),
                    "hora_inicio": fs_str("07:00"), "hora_fin": fs_str("15:30"),
                    "activo": fs_bool(False)}),
            fs_map({"seccion": fs_str("BODEGA"), "turno": fs_str("PM"),
                    "hora_inicio": fs_str("14:30"), "hora_fin": fs_str("22:30"),
                    "activo": fs_bool(False)}),
            fs_map({"seccion": fs_str("BODEGA"), "turno": fs_str("NOCHE"),
                    "hora_inicio": fs_str("21:30"), "hora_fin": fs_str("07:30"),
                    "activo": fs_bool(False)}),
        ])
    }

    wr = requests.patch(
        f"{DB_BASE}/config/time_restrictions",
        headers=hdrs_fs, json={"fields": config_fields},
        proxies=PROXIES, verify=False, timeout=15
    )
    if wr.status_code in (200, 201):
        print("   Config creado correctamente.")
    else:
        print(f"   ERROR {wr.status_code}: {wr.text[:300]}")
        sys.exit(1)

    # ── Paso 3: Submission de prueba ─────────────────────────────
    print("[3] Creando submission de prueba (SALA AM)...")
    from datetime import datetime
    test_fields = {
        "local":       {"integerValue": "99"},
        "fecha":       fs_str(datetime.now().strftime("%Y-%m-%d")),
        "seccion":     fs_str("SALA"),
        "turno":       fs_str("AM"),
        "responsable": fs_str("TEST"),
        "estado":      fs_str("borrador"),
    }
    sr = requests.post(
        f"{DB_BASE}/submissions",
        headers=hdrs_fs, json={"fields": test_fields},
        proxies=PROXIES, verify=False, timeout=15
    )
    if sr.status_code in (200, 201):
        doc_id = sr.json()["name"].split("/")[-1]
        print(f"   Submission creada: {doc_id}")
        print()
        print("=" * 60)
        print("  FIRESTORE LISTO! Abre esta URL para probar:")
        print(f"  https://checklist-completitud.web.app/#editar/{doc_id}")
        print("=" * 60)
    else:
        print(f"   ERROR {sr.status_code}: {sr.text[:300]}")

if __name__ == "__main__":
    try: run()
    except Exception as e:
        print(f"\nERROR: {e}")
        sys.exit(1)
