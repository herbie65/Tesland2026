# React Uncontrolled Input Error Fix ✅

**Datum:** 30 januari 2026  
**Status:** ✅ OPGELOST

## 🔴 Error

```
Console Error:

A component is changing an uncontrolled input to be controlled. 
This is likely caused by the value changing from undefined to a 
defined value, which should not happen. Decide between using a 
controlled or uncontrolled input element for the lifetime of the 
component.

Location: src/app/admin/settings/SettingsClient.tsx (797:13) @ SettingsClient
```

## 🔍 Oorzaak

In het Settings formulier werden input velden gerenderd met values die **undefined** konden zijn:

```tsx
// VOOR (probleem):
<input
  value={settings.general.companyName}  // ❌ Kan undefined zijn!
  onChange={(e) => updateGroup("general", "companyName", e.target.value)}
/>
```

### Wat Gebeurde Er?

1. **Initial state**: `settings.general = {}` (leeg object)
2. **Input rendered**: `value={undefined}` → React ziet dit als **uncontrolled input**
3. **Data loaded**: `settings.general = { companyName: "Tesland" }`
4. **Re-render**: `value={"Tesland"}` → React ziet dit als **controlled input**
5. **ERROR**: Input verandert van uncontrolled naar controlled!

## ✅ Oplossing

### 1. Default Values Toevoegen

Alle settings krijgen nu **default values**:

```typescript
const SETTINGS_DEFAULTS: Record<string, any> = {
  general: {
    companyName: '',      // ✅ Always a string
    contactEmail: '',
    contactPhone: '',
    address: ''
  },
  planning: {
    dayStart: '08:30',
    dayEnd: '16:30',
    // ...
  },
  // ... andere settings
}
```

### 2. Inputs Met Fallback

Alle inputs gebruiken nu de `||` operator voor fallback:

```tsx
// NA (opgelost):
<input
  value={settings.general?.companyName || ''}  // ✅ Always string!
  onChange={(e) => updateGroup("general", "companyName", e.target.value)}
/>
```

### 3. Merge Strategie

De loadSettings functie merged nu de default values:

```typescript
const loadSettings = async () => {
  const data = await apiFetch("/api/settings")
  const merged: Record<string, any> = { ...SETTINGS_DEFAULTS }
  
  ;(data.items || []).forEach((item: SettingsGroup) => {
    // Merge defaults + loaded data
    merged[item.group] = { 
      ...SETTINGS_DEFAULTS[item.group] || {}, 
      ...(item.data || {}) 
    }
  })
  
  setSettings(merged)
}
```

## 🔧 Aanpassingen

### Bestand: SettingsClient.tsx

#### 1. Default Values Definitie
```typescript
// VOOR:
const EMPTY_SETTINGS: Record<string, any> = {
  general: {},  // ❌ Empty = undefined values
  planning: {},
  // ...
}

// NA:
const SETTINGS_DEFAULTS: Record<string, any> = {
  general: {
    companyName: '',      // ✅ Default empty string
    contactEmail: '',
    contactPhone: '',
    address: ''
  },
  planning: {
    dayStart: '08:30',
    dayEnd: '16:30',
    // ...
  },
  // ...
}
```

#### 2. Initial State
```typescript
// VOOR:
const [settings, setSettings] = useState<Record<string, any>>(EMPTY_SETTINGS)

// NA:
const [settings, setSettings] = useState<Record<string, any>>(SETTINGS_DEFAULTS)
```

#### 3. Input Fields (4 velden aangepast)
```tsx
// Bedrijfsnaam
<input
  value={settings.general?.companyName || ''}  // ✅ Added || ''
  onChange={(e) => updateGroup("general", "companyName", e.target.value)}
/>

// Contact Email
<input
  value={settings.general?.contactEmail || ''}  // ✅ Added || ''
  onChange={(e) => updateGroup("general", "contactEmail", e.target.value)}
/>

// Contact Telefoon
<input
  value={settings.general?.contactPhone || ''}  // ✅ Added || ''
  onChange={(e) => updateGroup("general", "contactPhone", e.target.value)}
/>

// Adres
<input
  value={settings.general?.address || ''}  // ✅ Added || ''
  onChange={(e) => updateGroup("general", "address", e.target.value)}
/>
```

#### 4. Load Functie
```typescript
// VOOR:
;(data.items || []).forEach((item: SettingsGroup) => {
  merged[item.group] = item.data || {}  // ❌ Could be empty
})

// NA:
;(data.items || []).forEach((item: SettingsGroup) => {
  merged[item.group] = { 
    ...SETTINGS_DEFAULTS[item.group as keyof typeof SETTINGS_DEFAULTS] || {}, 
    ...(item.data || {}) 
  }  // ✅ Merged with defaults
})
```

## 📊 React Controlled vs Uncontrolled Inputs

### Uncontrolled Input (❌ Vermijd)
```tsx
// Value is undefined
<input value={undefined} onChange={...} />

// React gebruikt interne state
// Geen warning, maar value wordt niet gesynchroniseerd
```

### Controlled Input (✅ Correct)
```tsx
// Value is ALWAYS a string (even if empty)
<input value={""} onChange={...} />
<input value={"Tesland"} onChange={...} />

// React synchroniseert value met state
// Predictable behavior
```

### Mixed (🔴 ERROR)
```tsx
// First render
<input value={undefined} onChange={...} />  // Uncontrolled

// Second render
<input value={"Tesland"} onChange={...} />  // Controlled

// ❌ React Error: Changing uncontrolled to controlled!
```

## 🎯 Best Practices

### 1. Always Initialize State
```typescript
// ❌ BAD
const [name, setName] = useState()

// ✅ GOOD
const [name, setName] = useState('')
```

### 2. Use Fallback in JSX
```tsx
// ❌ BAD
<input value={user.name} />

// ✅ GOOD
<input value={user?.name || ''} />
<input value={user?.name ?? ''} />
```

### 3. Provide Default Props
```typescript
// ❌ BAD
type Props = {
  initialValue?: string
}

// ✅ GOOD
type Props = {
  initialValue?: string
}

function Component({ initialValue = '' }: Props) {
  const [value, setValue] = useState(initialValue)
  // ...
}
```

### 4. Type Safety
```typescript
// ✅ GOOD - Explicitly type defaults
const DEFAULTS: Record<string, { [key: string]: string | number | boolean }> = {
  general: {
    companyName: '',    // string
    isActive: false,    // boolean
    employees: 0        // number
  }
}
```

## ✅ Verificatie

### Check Console
1. Open Developer Tools (F12)
2. Ga naar Console tab
3. Refresh de settings pagina
4. **Verwacht**: Geen "uncontrolled input" errors meer! ✅

### Test Functionaliteit
1. Ga naar `/admin/settings`
2. Type in "Bedrijfsnaam" veld
3. **Verwacht**: Waarde wordt gesynchroniseerd
4. Klik "Opslaan"
5. Refresh pagina
6. **Verwacht**: Waarde blijft behouden

## 🎊 Resultaat

**De React error is opgelost!**

Alle input velden zijn nu **controlled inputs** met gegarandeerde string values. De settings pagina werkt zonder console errors.

## 📝 Gerelateerde Concepten

### React 18 Strict Mode
In development mode met Strict Mode:
- Components worden **2x gerenderd**
- State initialisatie gebeurt 2x
- Dit maakt uncontrolled/controlled bugs duidelijker

### Controlled Components Pattern
```tsx
function Form() {
  const [value, setValue] = useState('')  // ✅ Initialize
  
  return (
    <input 
      value={value}                        // ✅ Always string
      onChange={(e) => setValue(e.target.value)}
    />
  )
}
```

### Optional Chaining & Nullish Coalescing
```tsx
// Optional chaining (?.)
settings?.general?.companyName  // undefined if any part is null/undefined

// Nullish coalescing (??)
settings?.general?.companyName ?? ''  // '' if null or undefined

// Logical OR (||)
settings?.general?.companyName || ''  // '' if falsy (null, undefined, '', 0, false)
```

## 🔗 Resources

- [React Docs: Controlled Components](https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable)
- [React Docs: Uncontrolled to Controlled Warning](https://react.dev/link/controlled-components)
- [TypeScript: Optional Chaining](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#optional-chaining)
