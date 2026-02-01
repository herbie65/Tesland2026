/**
 * Global event emitter for work order changes
 * Used to push real-time updates to connected SSE clients
 */

import { EventEmitter } from 'events'

class WorkOrderEvents extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(100) // Support many concurrent connections
  }

  notifyChange(workOrderId: string, changeType: string, data?: any) {
    this.emit('workorder-changed', { workOrderId, changeType, data, timestamp: new Date().toISOString() })
  }

  notifyStatusChange(workOrderId: string, newStatus: string) {
    console.log(`📤 SSE Push: Status change for ${workOrderId} → ${newStatus}`)
    this.emit('workorder-changed', { 
      workOrderId, 
      changeType: 'status', 
      data: { status: newStatus },
      timestamp: new Date().toISOString() 
    })
  }

  notifyColumnChange(workOrderId: string, newColumn: string) {
    console.log(`📤 SSE Push: Column change for ${workOrderId} → ${newColumn}`)
    this.emit('workorder-changed', { 
      workOrderId, 
      changeType: 'column', 
      data: { column: newColumn },
      timestamp: new Date().toISOString() 
    })
  }

  notifySessionChange(workOrderId: string) {
    const listenerCount = this.listenerCount('workorder-changed')
    console.log(`📤 SSE Push: Session change for work order ${workOrderId} (${listenerCount} listeners)`)
    this.emit('workorder-changed', { 
      workOrderId, 
      changeType: 'session',
      timestamp: new Date().toISOString() 
    })
  }
}

// Singleton instance
export const workOrderEvents = new WorkOrderEvents()
