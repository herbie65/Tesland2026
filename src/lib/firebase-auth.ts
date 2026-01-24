import { initializeApp, getApps } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, signOut, User } from 'firebase/auth'

const getFirebaseConfig = () => ({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
})

const getFirebaseApp = () => {
  const config = getFirebaseConfig()
  if (!config.apiKey || !config.authDomain || !config.projectId) {
    throw new Error('Firebase config missing for auth')
  }
  const apps = getApps()
  if (apps.length) return apps[0]
  return initializeApp(config)
}

export const getFirebaseAuth = () => {
  const app = getFirebaseApp()
  return getAuth(app)
}

export const loginWithEmailPassword = async (email: string, password: string) => {
  const auth = getFirebaseAuth()
  return signInWithEmailAndPassword(auth, email, password)
}

export const logout = async () => {
  const auth = getFirebaseAuth()
  return signOut(auth)
}

export const getCurrentUser = () => {
  const auth = getFirebaseAuth()
  return auth.currentUser as User | null
}
