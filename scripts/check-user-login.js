// Script to diagnose login issues
// Usage: node scripts/check-user-login.js <email> <password>

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkUserLogin(email, password) {
  console.log('\n🔍 Checking login for:', email)
  console.log('━'.repeat(60))

  try {
    // Check user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { roleRef: true },
    })

    if (!user) {
      console.log('❌ User not found with email:', email)
      
      // Try to find similar emails
      const allUsers = await prisma.user.findMany({
        select: { email: true, displayName: true, isActive: true }
      })
      console.log('\n📋 Available users:')
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.displayName || 'no name'}) - Active: ${u.isActive}`)
      })
      return
    }

    console.log('✅ User found:')
    console.log('  ID:', user.id)
    console.log('  Email:', user.email)
    console.log('  Display Name:', user.displayName || '(none)')
    console.log('  Is Active:', user.isActive)
    console.log('  Is System Admin:', user.isSystemAdmin)
    console.log('  Role:', user.roleRef?.name || '(none)')
    console.log('  Has Password:', user.password ? '✅ Yes' : '❌ No')
    
    if (!user.password) {
      console.log('\n❌ ERROR: User has no password set!')
      console.log('   The password field is empty in the database.')
      return
    }

    if (!user.isActive) {
      console.log('\n⚠️  WARNING: User account is not active!')
    }

    // Check password
    console.log('\n🔐 Checking password...')
    const isValid = await bcrypt.compare(password, user.password)
    
    if (isValid) {
      console.log('✅ Password is CORRECT!')
      console.log('\n✨ Login should work with these credentials.')
      
      if (!user.isActive) {
        console.log('\n⚠️  But account is INACTIVE - login will be rejected.')
        console.log('   Run this to activate:')
        console.log(`   UPDATE "User" SET "isActive" = true WHERE email = '${user.email}';`)
      }
    } else {
      console.log('❌ Password is INCORRECT!')
      console.log('\nThe password you provided does not match the hashed password in the database.')
      console.log('\n💡 To reset the password, you can:')
      console.log('1. Delete the user and create a new one with the correct password')
      console.log('2. Or update the password hash directly in the database')
      console.log('\nTo create a new hash for password "newpassword123":')
      const newHash = await bcrypt.hash('newpassword123', 10)
      console.log(`\nUPDATE "User" SET password = '${newHash}' WHERE email = '${user.email}';`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Get email and password from command line
const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.log('Usage: node scripts/check-user-login.js <email> <password>')
  console.log('Example: node scripts/check-user-login.js john@example.com mypassword123')
  process.exit(1)
}

checkUserLogin(email, password)
