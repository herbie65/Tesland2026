import { getVoipSettings } from './settings'

export type ClickToDialRequest = {
  // NOTE: VoIPgrid API uses snake_case keys.
  b_number: string // Number to call
  a_number?: string // Optional: which extension should initiate the call
  b_cli?: string // Optional: CLI for the called party (default_number or specific number)
  auto_answer?: boolean // Optional: auto-answer incoming call
}

export type ClickToDialResponse = {
  callid: string
  status?: string
}

export type CallStatus = 
  | null 
  | 'dialing_a' 
  | 'dialing_b' 
  | 'connected' 
  | 'disconnected' 
  | 'failing_a' 
  | 'failing_b'

export type CallStatusResponse = {
  callid: string
  status: CallStatus
}

/**
 * Initiate a click-to-dial call via VoIPgrid API
 */
export async function initiateCall(
  phoneNumber: string,
  userExtension?: string,
  autoAnswer: boolean = true
): Promise<ClickToDialResponse> {
  const settings = await getVoipSettings()
  
  if (!settings || !settings.enabled) {
    throw new Error('VoIP integration is not enabled')
  }
  
  if (!settings.apiEmail || !settings.apiToken) {
    throw new Error('VoIP credentials not configured')
  }
  
  // Clean phone number
  const cleanNumber = phoneNumber.replace(/[\s\-()]/g, '')
  
  // Prepare request body
  const body: ClickToDialRequest = {
    b_number: cleanNumber,
    b_cli: 'default_number',
    auto_answer: autoAnswer
  }
  
  // Add extension if provided
  if (userExtension) {
    body.a_number = userExtension
  }
  
  // Make API call to VoIPgrid
  const authHeader = `Token ${settings.apiEmail}:${settings.apiToken}`
  
  const response = await fetch('https://api.voipgrid.nl/api/clicktodial/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(body)
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`VoIP API error: ${response.status} - ${error}`)
  }
  
  const data = await response.json()
  
  return {
    callid: data.callid,
    status: data.status
  }
}

/**
 * Get the status of an ongoing call
 */
export async function getCallStatus(callId: string): Promise<CallStatusResponse> {
  const settings = await getVoipSettings()
  
  if (!settings || !settings.enabled) {
    throw new Error('VoIP integration is not enabled')
  }
  
  if (!settings.apiEmail || !settings.apiToken) {
    throw new Error('VoIP credentials not configured')
  }
  
  const authHeader = `Token ${settings.apiEmail}:${settings.apiToken}`
  
  const response = await fetch(`https://api.voipgrid.nl/api/clicktodial/${callId}/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': authHeader
    }
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`VoIP API error: ${response.status} - ${error}`)
  }
  
  const data = await response.json()
  
  return {
    callid: data.callid,
    status: data.status
  }
}

/**
 * Hang up / cancel an ongoing call (best-effort).
 * VoIPgrid exposes the clicktodial call resource; DELETE will end the call if supported.
 */
export async function hangupCall(callId: string): Promise<void> {
  const settings = await getVoipSettings()

  if (!settings || !settings.enabled) {
    throw new Error('VoIP integration is not enabled')
  }

  if (!settings.apiEmail || !settings.apiToken) {
    throw new Error('VoIP credentials not configured')
  }

  const authHeader = `Token ${settings.apiEmail}:${settings.apiToken}`

  const response = await fetch(`https://api.voipgrid.nl/api/clicktodial/${callId}/`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      'Authorization': authHeader
    }
  })

  if (!response.ok) {
    const error = await response.text().catch(() => '')
    throw new Error(`VoIP API error: ${response.status} - ${error}`)
  }
}

/**
 * Format call status for display
 */
export function formatCallStatus(status: CallStatus): string {
  switch (status) {
    case null:
      return 'Initialiseren...'
    case 'dialing_a':
      return 'Uw toestel wordt gebeld...'
    case 'dialing_b':
      return 'Klant wordt gebeld...'
    case 'connected':
      return 'Verbonden'
    case 'disconnected':
      return 'Verbroken'
    case 'failing_a':
      return 'Fout: kan uw toestel niet bereiken'
    case 'failing_b':
      return 'Fout: kan klant niet bereiken'
    default:
      return 'Onbekend'
  }
}
