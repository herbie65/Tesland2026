import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { SETTINGS_DEFAULTS } from "@/lib/settings-defaults"

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ["SYSTEM_ADMIN"])
    ensureAdmin()
    if (!adminFirestore) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin not initialized" },
        { status: 500 }
      )
    }

    const settingsRef = adminFirestore.collection("settings")
    const nowIso = new Date().toISOString()
    const created: string[] = []

    for (const [group, data] of Object.entries(SETTINGS_DEFAULTS)) {
      const docRef = settingsRef.doc(group)
      const docSnap = await docRef.get()
      if (!docSnap.exists) {
        await docRef.set({
          group,
          data,
          updated_at: nowIso
        })
        created.push(group)
      }
    }

    return NextResponse.json({ success: true, created })
  } catch (error: any) {
    console.error("Error bootstrapping settings:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
