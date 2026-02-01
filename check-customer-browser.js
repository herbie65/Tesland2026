// Quick check script - run this in browser console on /admin/customers page

// Check werkorder W026-0004
fetch('/api/workorders?workOrderNumber=W026-0004')
  .then(r => r.json())
  .then(data => {
    const wo = data.find(w => w.workOrderNumber === 'W026-0004')
    if (wo) {
      console.log('Werkorder gevonden:', wo)
      console.log('Customer ID:', wo.customerId)
      console.log('Customer Name:', wo.customerName)
      
      // Nu check of klant bestaat
      if (wo.customerId) {
        fetch(`/api/customers/${wo.customerId}`)
          .then(r => r.json())
          .then(customer => {
            console.log('Klant bestaat:', customer)
          })
          .catch(err => {
            console.log('Klant NIET gevonden in database!', err)
          })
      } else {
        console.log('PROBLEEM: Werkorder heeft geen customerId!')
      }
    } else {
      console.log('Werkorder niet gevonden')
    }
  })

// Of check alle klanten
fetch('/api/customers')
  .then(r => r.json())
  .then(customers => {
    console.log(`Totaal ${customers.length} klanten in database`)
    
    // Zoek klanten zonder ID
    const orphaned = customers.filter(c => !c.id)
    console.log(`${orphaned.length} klanten zonder ID`)
  })
