#!/usr/bin/env node

/**
 * Test alle API endpoints voor basis functionaliteit
 */

const BASE_URL = 'http://localhost:3000'

// Get JWT token from localStorage (needs manual setup first)
const JWT_TOKEN = process.env.JWT_TOKEN || ''

const testEndpoints = [
  // Auth endpoints
  { method: 'GET', path: '/api/auth/me', auth: true, name: 'Auth Me' },
  { method: 'GET', path: '/api/admin/me', auth: true, name: 'Admin Me' },
  
  // Core entities
  { method: 'GET', path: '/api/users', auth: true, name: 'List Users' },
  { method: 'GET', path: '/api/roles', auth: true, name: 'List Roles' },
  { method: 'GET', path: '/api/customers', auth: false, name: 'List Customers' },
  { method: 'GET', path: '/api/vehicles', auth: false, name: 'List Vehicles' },
  { method: 'GET', path: '/api/planning-types', auth: false, name: 'List Planning Types' },
  { method: 'GET', path: '/api/notifications', auth: true, name: 'List Notifications' },
  
  // Settings
  { method: 'GET', path: '/api/settings', auth: true, name: 'Get Settings' },
  { method: 'GET', path: '/api/admin/profile', auth: true, name: 'Get Profile' },
  
  // Health
  { method: 'GET', path: '/api/health/db', auth: false, name: 'Database Health' },
]

async function testEndpoint(test) {
  const headers = {
    'Content-Type': 'application/json',
  }
  
  if (test.auth && JWT_TOKEN) {
    headers['Authorization'] = `Bearer ${JWT_TOKEN}`
  }
  
  try {
    const response = await fetch(`${BASE_URL}${test.path}`, {
      method: test.method,
      headers,
    })
    
    const data = await response.json()
    
    const status = response.ok ? '✅' : '❌'
    const statusCode = response.status
    const errorMsg = data.error || ''
    
    console.log(`${status} [${statusCode}] ${test.name} - ${test.path}`)
    
    if (!response.ok) {
      console.log(`   Error: ${errorMsg}`)
    }
    
    return response.ok
  } catch (error) {
    console.log(`❌ FAILED ${test.name} - ${error.message}`)
    return false
  }
}

async function runTests() {
  console.log('🧪 Testing API Endpoints...\n')
  
  if (!JWT_TOKEN) {
    console.log('⚠️  No JWT_TOKEN env var set - auth tests will fail')
    console.log('   Login first, then run: JWT_TOKEN="your-token" node test-api-endpoints.js\n')
  }
  
  let passed = 0
  let failed = 0
  
  for (const test of testEndpoints) {
    const result = await testEndpoint(test)
    if (result) {
      passed++
    } else {
      failed++
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`)
  
  if (failed === 0) {
    console.log('🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('❌ Some tests failed')
    process.exit(1)
  }
}

runTests()
