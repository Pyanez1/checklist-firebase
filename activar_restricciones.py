"""
Activa las restricciones horarias en Firestore.
Ventanas por defecto del Excel original.
"""
import sys, requests
from google.oauth2 import service_account
import google.auth.transport.requests

SA_FILE = r"C:\Users\pyanez1\Downloads\checklist-completitud-firebase-adminsdk-fbsvc-9130bf7e95.json"
PROJECT = "checklist-completitud"
SCOPES  = ["https://www.googleapis.com/auth/datastore"]
PROXIES = {"http":"http://sysproxy.wal-mart.com:8080",
           "https":"http://sysproxy.wal-mart.com:8080"}
DB_BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"

# Ventanas horarias — edita aqui si necesitas cambiarlas
RESTRICTIONS = [
    {"seccion":"SALA",   "turno":"AM",    "hora_inicio":"07:00", "hora_fin":"15:30", "activo":True},
    {"seccion":"SALA",   "turno":"PM",    "hora_inicio":"14:30", "hora_fin":"22:30", "activo":True},
    {"seccion":"SALA",   "turno":"NOCHE", "hora_inicio":"21:30", "hora_fin":"07:30", "activo":True},
    {"seccion":"BODEGA", "turno":"AM",    "hora_inicio":"07:00", "hora_fin":"15:30", "activo":True},
    {"seccion":"BODEGA", "turno":"PM",    "hora_inicio":"14:30", "hora_fin":"22:30", "activo":True},
    {"seccion":"BODEGA", "turno":"NOCHE", "hora_inicio":"21:30", "hora_fin":"07:30", "activo":True},
]

def fs_map(d):  return {"mapValue":   {"fields": {k: fs_val(v) for k,v in d.items()}}}
def fs_arr(lst): return {"arrayValue": {"values": [fs_val(i) for i in lst]}}
def fs_val(v):
    if isinstance(v, bool): return {"booleanValue": v}
    if isinstance(v, str):  return {"stringValue": v}
    if isinstance(v, list): return fs_arr(v)
    if isinstance(v, dict): return fs_map(v)
    return {"nullValue": None}

def run():
    import urllib3; urllib3.disable_warnings()
    creds = service_account.Credentials.from_service_account_file(SA_FILE, scopes=SCOPES)
    creds.refresh(google.auth.transport.requests.Request())
    hdrs = {"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"}

    print("Activando restricciones horarias en Firestore...")
    body = {"fields": {"restrictions": fs_arr(RESTRICTIONS)}}
    r = requests.patch(
        f"{DB_BASE}/config/time_restrictions",
        headers=hdrs, json=body, proxies=PROXIES, verify=False, timeout=15
    )
    if r.status_code in (200, 201):
        print()
        print("=" * 55)
        print("  RESTRICCIONES ACTIVADAS")
        print()
        for res in RESTRICTIONS:
            estado = "ON " if res["activo"] else "OFF"
            print(f"  [{estado}] {res['seccion']:6} {res['turno']:5}  {res['hora_inicio']} - {res['hora_fin']}")
        print()
        print("  Puedes ajustar las horas en:")
        print("  Config -> Horarios -> Guardar")
        print("=" * 55)
    else:
        print(f"ERROR {r.status_code}: {r.text[:300]}")

if __name__ == "__main__":
    try: run()
    except Exception as e: print(f"ERROR: {e}"); sys.exit(1)
