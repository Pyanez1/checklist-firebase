"""
Diagnostico y fix de Firestore:
1. Verifica si se puede leer y escribir en Firestore via REST
2. Inicializa el config de restricciones (activo: false)
"""
import json, sys, requests
from google.oauth2 import service_account
import google.auth.transport.requests

SA_FILE  = r"C:\Users\pyanez1\Downloads\checklist-completitud-firebase-adminsdk-fbsvc-9130bf7e95.json"
PROJECT  = "checklist-completitud"
DB       = f"projects/{PROJECT}/databases/(default)/documents"
BASE     = f"https://firestore.googleapis.com/v1/{DB}"
SCOPES   = ["https://www.googleapis.com/auth/datastore"]
PROXIES  = {"http":"http://sysproxy.wal-mart.com:8080",
            "https":"http://sysproxy.wal-mart.com:8080"}

def get_token():
    creds = service_account.Credentials.from_service_account_file(SA_FILE, scopes=SCOPES)
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token

def fs_value(v):
    if isinstance(v, bool):   return {"booleanValue": v}
    if isinstance(v, int):    return {"integerValue": str(v)}
    if isinstance(v, float):  return {"doubleValue": v}
    if isinstance(v, str):    return {"stringValue": v}
    if isinstance(v, list):   return {"arrayValue": {"values": [fs_value(i) for i in v]}}
    if isinstance(v, dict):   return {"mapValue":   {"fields": {k: fs_value(u) for k,u in v.items()}}}
    return {"nullValue": None}

def run():
    import urllib3
    urllib3.disable_warnings()

    print("[1] Obteniendo token de Firestore...")
    token = get_token()
    hdrs  = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Test lectura
    print("[2] Probando lectura...")
    r = requests.get(f"{BASE}/config/time_restrictions",
                     headers=hdrs, proxies=PROXIES, verify=False, timeout=10)
    if r.status_code == 200:
        print("   Config ya existe en Firestore")
    elif r.status_code == 404:
        print("   Config no existe - lo creo con restricciones desactivadas...")

        restrictions = [
            {"seccion":"SALA",   "turno":"AM",    "hora_inicio":"07:00","hora_fin":"15:30","activo":False},
            {"seccion":"SALA",   "turno":"PM",    "hora_inicio":"14:30","hora_fin":"22:30","activo":False},
            {"seccion":"SALA",   "turno":"NOCHE", "hora_inicio":"21:30","hora_fin":"07:30","activo":False},
            {"seccion":"BODEGA", "turno":"AM",    "hora_inicio":"07:00","hora_fin":"15:30","activo":False},
            {"seccion":"BODEGA", "turno":"PM",    "hora_inicio":"14:30","hora_fin":"22:30","activo":False},
            {"seccion":"BODEGA", "turno":"NOCHE", "hora_inicio":"21:30","hora_fin":"07:30","activo":False},
        ]
        body = {"fields": fs_value({"restrictions": restrictions})["mapValue"]["fields"]}
        wr = requests.patch(
            f"{BASE}/config/time_restrictions",
            headers=hdrs, json=body, proxies=PROXIES, verify=False, timeout=10
        )
        if wr.status_code in (200, 201):
            print("   Config creado OK")
        else:
            print(f"   ERROR escribiendo config: {wr.status_code} {wr.text[:200]}")
            return
    else:
        print(f"   ERROR leyendo: {r.status_code} {r.text[:300]}")
        return

    # Test escritura de submission de prueba
    print("[3] Probando escritura (submission de prueba)...")
    from datetime import datetime
    test_doc = {
        "local": {"integerValue": "99"},
        "fecha": {"stringValue": datetime.now().strftime("%Y-%m-%d")},
        "seccion": {"stringValue": "SALA"},
        "turno": {"stringValue": "AM"},
        "responsable": {"stringValue": "TEST-PUPPY"},
        "estado": {"stringValue": "borrador"},
    }
    wr2 = requests.post(
        f"{BASE}/submissions",
        headers=hdrs, json={"fields": test_doc},
        proxies=PROXIES, verify=False, timeout=10
    )
    if wr2.status_code in (200, 201):
        doc_id = wr2.json()["name"].split("/")[-1]
        print(f"   Submission de prueba creada: {doc_id}")
        print()
        print("=" * 60)
        print("  FIRESTORE FUNCIONA CORRECTAMENTE")
        print("  El problema debe ser en el JS del navegador.")
        print(f"  URL de prueba: https://checklist-completitud.web.app/#editar/{doc_id}")
        print("=" * 60)
    else:
        print(f"   ERROR escribiendo: {wr2.status_code}")
        print(f"   {wr2.text[:400]}")
        print()
        print("=" * 60)
        print("  FIRESTORE BLOQUEA LAS ESCRITURAS")
        print("  Las reglas de seguridad niegan el acceso.")
        print("=" * 60)

if __name__ == "__main__":
    try:
        run()
    except Exception as e:
        print(f"\nERROR: {e}")
        sys.exit(1)
