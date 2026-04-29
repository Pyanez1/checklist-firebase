"""
Lista todas las bases de datos Firestore del proyecto.
"""
import sys, requests
from google.oauth2 import service_account
import google.auth.transport.requests

SA_FILE = r"C:\Users\pyanez1\Downloads\checklist-completitud-firebase-adminsdk-fbsvc-9130bf7e95.json"
PROJECT = "checklist-completitud"
SCOPES  = ["https://www.googleapis.com/auth/cloud-platform"]
PROXIES = {"http":"http://sysproxy.wal-mart.com:8080",
           "https":"http://sysproxy.wal-mart.com:8080"}

def run():
    import urllib3; urllib3.disable_warnings()
    creds = service_account.Credentials.from_service_account_file(SA_FILE, scopes=SCOPES)
    creds.refresh(google.auth.transport.requests.Request())
    hdrs = {"Authorization": f"Bearer {creds.token}"}

    # Listar databases via Admin API
    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases"
    r = requests.get(url, headers=hdrs, proxies=PROXIES, verify=False, timeout=10)
    print("Status:", r.status_code)
    print(r.text[:800])

if __name__ == "__main__":
    try: run()
    except Exception as e: print("ERROR:", e)
