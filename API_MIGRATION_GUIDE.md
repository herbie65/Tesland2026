# API Migratie Guide: Firestore → Prisma

Dit document laat zien hoe je API routes migreert van Firestore naar PostgreSQL met Prisma.

## 📋 Basisprincipes

### Firestore (oud)
```typescript
import { adminFirestore } from '@/lib/firebase-admin'

const firestore = adminFirestore
const snapshot = await firestore.collection('customers').get()
const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
```

### Prisma (nieuw)
```typescript
import { prisma } from '@/lib/prisma'

const items = await prisma.customer.findMany()
```

## 🔄 Migratie Voorbeelden

### Voorbeeld 1: GET /api/customers (list)

#### VOOR (Firestore)
```typescript
// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { FirebaseAdminService } from '@/lib/firebase-admin-service'

export async function GET() {
  try {
    const items = await FirebaseAdminService.listCollection('customers')
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

#### NA (Prisma)
```typescript
// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const items = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        vehicles: true, // Optioneel: include related vehicles
      },
    })
    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

### Voorbeeld 2: POST /api/customers (create)

#### VOOR (Firestore)
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, company, address } = body || {}

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      address: address || null
    }

    const created = await FirebaseAdminService.createCollectionItem('customers', payload)
    return NextResponse.json({ success: true, item: created }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

#### NA (Prisma)
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, company, address } = body || {}

    if (!name) {
      return NextResponse.json({ success: false, error: 'name is required' }, { status: 400 })
    }

    const created = await prisma.customer.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        address: address || null,
      }
    })

    return NextResponse.json({ success: true, item: created }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

### Voorbeeld 3: GET /api/customers/[id] (get by id)

#### VOOR (Firestore)
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const docSnap = await firestore.collection('customers').doc(id).get()
    
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    const item = { id: docSnap.id, ...docSnap.data() }
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

#### NA (Prisma)
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const item = await prisma.customer.findUnique({
      where: { id },
      include: {
        vehicles: true, // Include related data
      },
    })
    
    if (!item) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

### Voorbeeld 4: PATCH/PUT /api/customers/[id] (update)

#### VOOR (Firestore)
```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    await firestore.collection('customers').doc(id).set(body, { merge: true })
    
    return NextResponse.json({ success: true, item: { id, ...body } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

#### NA (Prisma)
```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    const updated = await prisma.customer.update({
      where: { id },
      data: body,
    })
    
    return NextResponse.json({ success: true, item: updated })
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Record not found
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

### Voorbeeld 5: DELETE /api/customers/[id]

#### VOOR (Firestore)
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    await firestore.collection('customers').doc(id).delete()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

#### NA (Prisma)
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    await prisma.customer.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

## 🔍 Query Voorbeelden

### Filteren (WHERE)

#### Firestore
```typescript
const snapshot = await firestore
  .collection('workOrders')
  .where('assigneeId', '==', userId)
  .get()
```

#### Prisma
```typescript
const items = await prisma.workOrder.findMany({
  where: {
    assigneeId: userId,
  },
})
```

### Meerdere Filters (AND)

#### Firestore
```typescript
const snapshot = await firestore
  .collection('workOrders')
  .where('assigneeId', '==', userId)
  .where('workOrderStatus', '==', 'GEPLAND')
  .get()
```

#### Prisma
```typescript
const items = await prisma.workOrder.findMany({
  where: {
    AND: [
      { assigneeId: userId },
      { workOrderStatus: 'GEPLAND' },
    ],
  },
})
// Of korter:
const items = await prisma.workOrder.findMany({
  where: {
    assigneeId: userId,
    workOrderStatus: 'GEPLAND',
  },
})
```

### OR Queries

#### Prisma
```typescript
const items = await prisma.workOrder.findMany({
  where: {
    OR: [
      { workOrderStatus: 'GEPLAND' },
      { workOrderStatus: 'IN_UITVOERING' },
    ],
  },
})
```

### Sorteren (ORDER BY)

#### Firestore
```typescript
const snapshot = await firestore
  .collection('customers')
  .orderBy('createdAt', 'desc')
  .get()
```

#### Prisma
```typescript
const items = await prisma.customer.findMany({
  orderBy: {
    createdAt: 'desc',
  },
})

// Meerdere sorteringen:
const items = await prisma.customer.findMany({
  orderBy: [
    { createdAt: 'desc' },
    { name: 'asc' },
  ],
})
```

### Limit & Offset (Pagination)

#### Firestore
```typescript
const snapshot = await firestore
  .collection('customers')
  .limit(20)
  .get()
```

#### Prisma
```typescript
const items = await prisma.customer.findMany({
  take: 20,
  skip: 0,
})

// Met pagination:
const page = 2
const pageSize = 20
const items = await prisma.customer.findMany({
  take: pageSize,
  skip: (page - 1) * pageSize,
})
```

### Relaties Includen

#### Prisma (veel makkelijker dan Firestore!)
```typescript
// Customer met vehicles
const customer = await prisma.customer.findUnique({
  where: { id: customerId },
  include: {
    vehicles: true,
  },
})

// WorkOrder met alles
const workOrder = await prisma.workOrder.findUnique({
  where: { id: workOrderId },
  include: {
    customer: true,
    vehicle: true,
    assignee: true,
    partsLines: {
      include: {
        product: true,
      },
    },
  },
})
```

### Transactions

#### Firestore
```typescript
await firestore.runTransaction(async (transaction) => {
  const docRef = firestore.collection('counters').doc('workorders')
  const doc = await transaction.get(docRef)
  const newValue = (doc.data()?.value || 0) + 1
  transaction.update(docRef, { value: newValue })
  return newValue
})
```

#### Prisma
```typescript
const result = await prisma.$transaction(async (tx) => {
  const counter = await tx.counter.findUnique({
    where: { id: 'workorders' },
  })
  
  const newValue = (counter?.currentValue || 0) + 1
  
  await tx.counter.update({
    where: { id: 'workorders' },
    data: { currentValue: newValue },
  })
  
  return newValue
})
```

### Aggregaties (COUNT, SUM, etc.)

#### Prisma
```typescript
// Count
const count = await prisma.customer.count()

// Count met filter
const activeCount = await prisma.workOrder.count({
  where: {
    workOrderStatus: 'IN_UITVOERING',
  },
})

// Aggregate
const result = await prisma.partsLine.aggregate({
  _sum: {
    totalPrice: true,
  },
  _avg: {
    unitPrice: true,
  },
  _count: true,
})
```

## 🎯 Migratievolgorde

Migreer API routes in deze volgorde (van simpel naar complex):

1. ✅ `/api/health/db` (al gedaan)
2. `/api/roles` - Simpele CRUD
3. `/api/customers` - Simpele CRUD
4. `/api/planning-types` - Simpele CRUD
5. `/api/vehicles` - CRUD met relatie (customer)
6. `/api/users` - CRUD met relatie (role)
7. `/api/planning` - Complexere logica
8. `/api/workorders` - Meest complex (veel relaties)
9. `/api/settings` - JSONB velden
10. Overige endpoints

## 💡 Tips

1. **Test elk endpoint** na migratie met `/api/health/db` patroon
2. **Gebruik Prisma Studio** om data te inspecteren tijdens development
3. **Houd Firestore code** tijdelijk (comment out) tot alles getest is
4. **Gebruik transactions** voor complexe operaties met meerdere writes
5. **Include relaties** waar nodig, maar niet overal (performance!)
6. **Error handling** - Let op Prisma error codes (P2025 = not found, etc.)

## 📚 Prisma Error Codes

- `P2025` - Record not found
- `P2002` - Unique constraint failed
- `P2003` - Foreign key constraint failed
- `P2016` - Query interpretation error

Zie: https://www.prisma.io/docs/reference/api-reference/error-reference

## 🚀 Next Steps

1. Kies een simpel endpoint (bijv. `/api/roles`)
2. Migreer naar Prisma
3. Test grondig
4. Herhaal voor volgende endpoint
5. Update documentatie
