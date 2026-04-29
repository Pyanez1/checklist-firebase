// ── Firebase shared instance ───────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDWym87qCZIZI53aJQzSc8G_a-mVWsUfsw",
  authDomain:        "checklist-completitud.firebaseapp.com",
  projectId:         "checklist-completitud",
  storageBucket:     "checklist-completitud.firebasestorage.app",
  messagingSenderId: "214618832835",
  appId:             "1:214618832835:web:a748c9f313cb155b9a0776"
};

export const fbApp = initializeApp(firebaseConfig);
export const db    = getFirestore(fbApp);
