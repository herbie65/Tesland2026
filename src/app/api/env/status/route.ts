import { NextResponse } from 'next/server'

const REQUIRED_PUBLIC_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
]

const REQUIRED_SERVER_KEYS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_SERVICE_ACCOUNT_KEY'
]

export async function GET() {
  const missingPublic = REQUIRED_PUBLIC_KEYS.filter((key) => !process.env[key])
  const missingServer = REQUIRED_SERVER_KEYS.filter((key) => !process.env[key])
  return NextResponse.json({
    ok: missingPublic.length === 0,
    missingPublic,
    missingServer
  })
}
