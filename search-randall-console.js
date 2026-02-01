// Zoek naar Randall van poelvoorde
// Open /admin/customers en plak dit in de console (F12)

console.log('🔍 Zoeken naar Randall van poelvoorde...')

fetch('/api/customers')
  .then(r => r.json())
  .then(customers => {
    console.log(`📊 Totaal ${customers.length} klanten in database`)
    
    // Zoek exact
    const exact = customers.filter(c => 
      c.name?.toLowerCase() === 'randall van poelvoorde'
    )
    console.log('✅ Exacte match:', exact.length, exact)
    
    // Zoek met Randall
    const withRandall = customers.filter(c => 
      c.name?.toLowerCase().includes('randall')
    )
    console.log('📝 Met "Randall":', withRandall.length, withRandall)
    
    // Zoek met poelvoorde
    const withPoelvoorde = customers.filter(c => 
      c.name?.toLowerCase().includes('poelvoorde')
    )
    console.log('📝 Met "poelvoorde":', withPoelvoorde.length, withPoelvoorde)
    
    // Zoek met van
    const withVan = customers.filter(c => 
      c.name?.toLowerCase().includes('van') &&
      (c.name?.toLowerCase().includes('randall') || 
       c.name?.toLowerCase().includes('poelvoorde'))
    )
    console.log('📝 Met "van":', withVan.length, withVan)
    
    // Alle mogelijke varianten
    const variants = [
      'randall van poelvoorde',
      'randall poelvoorde',
      'r. van poelvoorde',
      'van poelvoorde',
      'poelvoorde, randall'
    ]
    
    console.log('\n🔄 Probeer varianten:')
    variants.forEach(variant => {
      const found = customers.filter(c => 
        c.name?.toLowerCase().includes(variant.toLowerCase())
      )
      if (found.length > 0) {
        console.log(`  ✅ "${variant}":`, found)
      } else {
        console.log(`  ❌ "${variant}": Niet gevonden`)
      }
    })
    
    // Check in werkorders
    console.log('\n🔍 Zoeken in werkorders...')
    fetch('/api/workorders')
      .then(r => r.json())
      .then(workorders => {
        const inWorkorders = workorders.filter(wo => 
          wo.customerName?.toLowerCase().includes('randall') ||
          wo.customerName?.toLowerCase().includes('poelvoorde')
        )
        console.log('📋 In werkorders:', inWorkorders.length, inWorkorders)
        
        if (inWorkorders.length > 0) {
          console.log('\n⚠️  GEVONDEN IN WERKORDERS maar niet in klanten!')
          console.log('Dit betekent: customer_id is NULL of klant is verwijderd')
          inWorkorders.forEach(wo => {
            console.log(`  - ${wo.workOrderNumber}: "${wo.customerName}" (customer_id: ${wo.customerId || 'NULL'})`)
          })
        }
      })
  })
