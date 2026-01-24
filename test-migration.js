#!/usr/bin/env node

/**
 * Final Migration Test Script
 * Test alle belangrijke endpoints om te kijken of ze werken
 */

const BASE_URL = 'http://localhost:3000'

// Get token from localStorage (je moet eerst inloggen in de browser)
const TOKEN = process.env.TEST_TOKEN || ''

const endpoints = [
  // Auth
  { method: 'GET', path: '/api/auth/me', auth: true, name: 'Auth Check' },
  
  // Core Data
  { method: 'GET', path: '/api/customers', auth: true, name: 'Customers' },
  { method: 'GET', path: '/api/vehicles', auth: true, name: 'Vehicles' },
  { method: 'GET', path: '/api/users', auth: true, name: 'Users' },
  { method: 'GET', path: '/api/roles', auth: true, name: 'Roles' },
  
  // Planning & Work
  { method: 'GET', path: '/api/planning', auth: true, name: 'Planning' },
  { method: 'GET', path: '/api/workorders', auth: true, name: 'Work Orders' },
  { method: 'GET', path: '/api/parts-lines', auth: true, name: 'Parts Lines' },
  
  // Inventory
  { method: 'GET', path: '/api/products', auth: true, name: 'Products' },
  { method: 'GET', path: '/api/inventory-locations', auth: true, name: 'Inventory Locations' },
  { method: 'GET', path: '/api/stock-moves', auth: true, name: 'Stock Moves' },
  
  // Sales
  { method: 'GET', path: '/api/orders', auth: true, name: 'Orders' },
  { method: 'GET', path: '/api/invoices', auth: true, name: 'Invoices' },
  { method: 'GET', path: '/api/credit-invoices', auth: true, name: 'Credit Invoices' },
  { method: 'GET', path: '/api/rmas', auth: true, name: 'RMAs' },
  { method: 'GET', path: '/api/purchase-orders', auth: true, name: 'Purchase Orders' },
  
  // Settings & Admin
  { method: 'GET', path: '/api/settings', auth: true, name: 'Settings' },
  { method: 'GET', path: '/api/notifications', auth: true, name: 'Notifications' },
  { method: 'GET', path: '/api/planning-types', auth: true, name: 'Planning Types' },
  
  // Public
  { method: 'GET', path: '/api/health/db', auth: false, name: 'Database Health' },
]

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`
  const headers = {}
  
  if (endpoint.auth && TOKEN) {
    headers['Authorization'] = `Bearer ${TOKEN}`
  }
  
  try {
    const response = await fetch(url, { method: endpoint.method, headers })
    const status = response.status
    const statusText = status >= 200 && status < 300 ? '✅' : '❌'
    
    console.log(`${statusText} [${status}] ${endpoint.name.padEnd(25)} ${endpoint.path}`)
    
    if (status >= 400) {
      const text = await response.text()
      console.log(`   Error: ${text.substring(0, 100)}`)
    }
    
    return status < 400
  } catch (error) {
    console.log(`❌ [ERR] ${endpoint.name.padEnd(25)} ${endpoint.path}`)
    console.log(`   ${error.message}`)
    return false
  }
}

async function runTests() {
  console.log('\n🔍 TESTING ALL MIGRATED ENDPOINTS\n')
  console.log('=' .repeat(80))
  
  if (!TOKEN) {
    console.log('\n⚠️  No TEST_TOKEN found. Set it with:')
    console.log('   export TEST_TOKEN="your-jwt-token-here"\n')
  }
  
  let passed = 0
  let failed = 0
  
  for (const endpoint of endpoints) {
    const success = await testEndpoint(endpoint)
    if (success) passed++
    else failed++
    
    // Small delay to not hammer the server
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log('=' .repeat(80))
  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed out of ${endpoints.length} endpoints`)
  
  if (failed === 0) {
    console.log('\n🎉 ALL ENDPOINTS WORKING! Migration complete!')
  } else {
    console.log(`\n⚠️  ${failed} endpoints need attention`)
  }
  
  process.exit(failed > 0 ? 1 : 0)
}

runTests()
