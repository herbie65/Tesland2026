// TEST: Check wat er gebeurd is met Randall
// Plak in browser console (F12) op /admin/customers

console.log('🔍 Checking recent customer updates...')

// 1. Check alle klanten met Randall/poelvoorde
fetch('/api/customers')
  .then(r => r.json())
  .then(customers => {
    const matches = customers.filter(c => 
      c.name?.toLowerCase().includes('randall') ||
      c.name?.toLowerCase().includes('poelvoorde')
    )
    
    console.log(`\n📋 Gevonden klanten (${matches.length}):`)
    matches.forEach(c => {
      console.log({
        id: c.id,
        naam: c.name,
        email: c.email,
        telefoon: c.phone,
        mobiel: c.mobile,
        adres: `${c.street || ''} ${c.zipCode || ''} ${c.city || ''}`.trim(),
        aangemaakt: c.createdAt,
        bijgewerkt: c.updatedAt,
        bron: c.source
      })
    })
    
    if (matches.length === 0) {
      console.log('❌ GEEN klanten gevonden met Randall/poelvoorde')
    } else if (matches.length > 1) {
      console.log('⚠️  MEERDERE klanten gevonden - mogelijk duplicaat!')
    }
    
    // 2. Check in werkorders
    console.log('\n🔍 Checking werkorders...')
    fetch('/api/workorders')
      .then(r => r.json())
      .then(workorders => {
        const woMatches = workorders.filter(wo => 
          wo.customerName?.toLowerCase().includes('randall') ||
          wo.customerName?.toLowerCase().includes('poelvoorde')
        )
        
        console.log(`\n📋 Werkorders met Randall (${woMatches.length}):`)
        woMatches.forEach(wo => {
          console.log({
            nummer: wo.workOrderNumber,
            klantNaam: wo.customerName,
            klantId: wo.customerId,
            status: wo.workOrderStatus,
            aangemaakt: wo.createdAt
          })
        })
        
        // Check mismatch
        if (woMatches.length > 0 && matches.length === 0) {
          console.log('\n❌ PROBLEEM: Randall staat in werkorder maar NIET in customers!')
          console.log('Mogelijk scenario: customer_id is NULL of verkeerd')
        }
        
        if (woMatches.length > 0 && matches.length > 0) {
          // Check of customer_id klopt
          woMatches.forEach(wo => {
            const customer = matches.find(c => c.id === wo.customerId)
            if (!customer) {
              console.log(`\n⚠️  Werkorder ${wo.workOrderNumber}: customer_id ${wo.customerId} komt niet overeen met gevonden klanten!`)
            } else {
              console.log(`\n✅ Werkorder ${wo.workOrderNumber} correct gekoppeld aan ${customer.name}`)
            }
          })
        }
      })
  })
