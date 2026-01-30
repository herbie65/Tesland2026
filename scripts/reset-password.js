const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function resetPassword() {
  const email = 'herbert@tesland.com'
  const newPassword = 'admin123'
  
  console.log(`Resetting password for ${email}...`)
  
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  
  const user = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  })
  
  console.log('✅ Password reset successful!')
  console.log(`Email: ${email}`)
  console.log(`Password: ${newPassword}`)
  console.log(`User ID: ${user.id}`)
}

resetPassword()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
