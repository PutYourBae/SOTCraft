import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Periksa apakah konfigurasi Firebase valid dan lengkap
const hasFirebaseConfig = 
  !!firebaseConfig.apiKey && 
  !!firebaseConfig.databaseURL && 
  firebaseConfig.apiKey !== 'undefined' && 
  firebaseConfig.databaseURL !== 'undefined'

let app = null
let db: any = null

if (hasFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig)
    db = getDatabase(app)
  } catch (error) {
    console.error("Gagal menginisialisasi Firebase:", error)
  }
} else {
  console.warn(
    "Kredensial Firebase tidak lengkap atau tidak ditemukan.\n" +
    "Aplikasi akan berjalan dalam mode fallback offline (tidak dapat menyimpan data ke cloud)."
  )
}

export { db }
