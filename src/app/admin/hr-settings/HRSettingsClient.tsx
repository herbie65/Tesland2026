'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { DatePicker } from '@/components/ui/DatePicker'

type User = {
  id: string
  email: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  dateOfBirth: string | null
  phoneNumber: string | null
  privateEmail: string | null
  iban: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  role: string | null
  employmentStartDate: string | null
  employmentEndDate: string | null
  hasFixedTermContract: boolean | null
  contractHoursPerWeek: number | null
  annualLeaveDaysOrHours: number | null
  workingDays: string[]
  emergencyContactName: string | null
  emergencyContactRelation: string | null
  emergencyContactPhone: string | null
  emergencyContactEmail: string | null
  hrNotes: string | null
  leaveBalanceLegal: number
  leaveBalanceExtra: number
  leaveBalanceCarryover: number
  // Planning fields
  color: string | null
  planningHoursPerDay: number | null
}

export default function HRSettingsClient() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Partial<User>>({})
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'MONTEUR',
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await apiFetch('/api/users')
      
      if (response && response.success) {
        setUsers(response.items || [])
      } else {
        console.error('Failed to load users:', response)
        setUsers([])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.password) {
      alert('Email en wachtwoord zijn verplicht')
      return
    }

    try {
      setSaving(true)
      const response = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: newUserData.email,
          password: newUserData.password,
          displayName: `${newUserData.firstName} ${newUserData.lastName}`.trim(),
          firstName: newUserData.firstName,
          lastName: newUserData.lastName,
          role: newUserData.role,
          workingDays: ['ma', 'di', 'wo', 'do', 'vr'],
          isActive: true,
        }),
      })

      if (response.success) {
        alert('Gebruiker succesvol aangemaakt!')
        setShowNewUserModal(false)
        setNewUserData({ email: '', password: '', firstName: '', lastName: '', role: 'MONTEUR' })
        await fetchUsers()
      } else {
        alert(`Fout: ${response.error}`)
      }
    } catch (error) {
      console.error('Failed to create user:', error)
      alert('Er is een fout opgetreden bij het aanmaken')
    } finally {
      setSaving(false)
    }
  }

  const handleSelectUser = (user: User) => {
    setSelectedUser(user)
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
      phoneNumber: user.phoneNumber || '',
      privateEmail: user.privateEmail || '',
      iban: user.iban || '',
      address: user.address || '',
      city: user.city || '',
      postalCode: user.postalCode || '',
      country: user.country || 'Nederland',
      role: user.role || '',
      employmentStartDate: user.employmentStartDate ? user.employmentStartDate.split('T')[0] : '',
      employmentEndDate: user.employmentEndDate ? user.employmentEndDate.split('T')[0] : '',
      hasFixedTermContract: user.hasFixedTermContract || false,
      contractHoursPerWeek: user.contractHoursPerWeek || 40,
      annualLeaveDaysOrHours: user.annualLeaveDaysOrHours || 25,
      workingDays: user.workingDays || ['ma', 'di', 'wo', 'do', 'vr'],
      color: user.color || '#4f46e5',
      planningHoursPerDay: user.planningHoursPerDay || 8,
      emergencyContactName: user.emergencyContactName || '',
      emergencyContactRelation: user.emergencyContactRelation || '',
      emergencyContactPhone: user.emergencyContactPhone || '',
      emergencyContactEmail: user.emergencyContactEmail || '',
      hrNotes: user.hrNotes || '',
      leaveBalanceLegal: user.leaveBalanceLegal || 0,
      leaveBalanceExtra: user.leaveBalanceExtra || 0,
      leaveBalanceCarryover: user.leaveBalanceCarryover || 0,
    })
  }

  const calculateAnnualLeave = () => {
    if (!formData.employmentStartDate || !formData.contractHoursPerWeek) return

    const startDate = new Date(formData.employmentStartDate)
    const now = new Date()
    const yearEnd = new Date(startDate.getFullYear(), 11, 31)
    
    // Check if employment started this year
    if (startDate.getFullYear() === now.getFullYear()) {
      const totalDaysInYear = 365
      const daysWorkedThisYear = Math.floor((yearEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const fullYearLeave = 25 // Standard 25 dagen
      const proRataLeave = (daysWorkedThisYear / totalDaysInYear) * fullYearLeave
      
      setFormData({ ...formData, annualLeaveDaysOrHours: Math.round(proRataLeave * 10) / 10 })
    } else {
      setFormData({ ...formData, annualLeaveDaysOrHours: 25 })
    }
  }

  const handleSave = async () => {
    if (!selectedUser) return

    try {
      setSaving(true)
      const response = await apiFetch(`/api/users/${selectedUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      })

      if (response.success) {
        alert('Gegevens succesvol opgeslagen!')
        await fetchUsers()
        
        // Update selected user
        const updatedUser = users.find(u => u.id === selectedUser.id)
        if (updatedUser) {
          setSelectedUser(updatedUser)
        }
      } else {
        alert(`Fout: ${response.error}`)
      }
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Er is een fout opgetreden bij het opslaan')
    } finally {
      setSaving(false)
    }
  }

  const toggleWorkingDay = (day: string) => {
    const current = formData.workingDays || []
    if (current.includes(day)) {
      setFormData({ ...formData, workingDays: current.filter(d => d !== day) })
    } else {
      setFormData({ ...formData, workingDays: [...current, day] })
    }
  }

  if (loading) {
    return <div className="text-center py-8">Laden...</div>
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Medewerkers</h3>
              <button
                onClick={() => setShowNewUserModal(true)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                + Nieuw
              </button>
            </div>
            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                    selectedUser?.id === user.id
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">{user.displayName || user.email}</div>
                  <div className="text-sm text-slate-500">{user.role || 'Geen rol'}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Details Form */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">
                  {selectedUser.displayName || selectedUser.email}
                </h3>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
              </div>

              <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {/* Persoonlijke Gegevens */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Persoonlijke Gegevens (Verplicht)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Voornaam <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstName || ''}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Achternaam <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.lastName || ''}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <DatePicker
                      label="Geboortedatum"
                      value={formData.dateOfBirth || ''}
                      onChange={(date) => setFormData({ ...formData, dateOfBirth: date })}
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Functie
                      </label>
                      <input
                        type="text"
                        value={formData.role || ''}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="bijv. Monteur, EV Specialist, Magazijn"
                      />
                    </div>
                  </div>
                </div>

                {/* Contractinformatie */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-slate-900 mb-3">Contractinformatie (Verplicht)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Contracturen per week <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.contractHoursPerWeek || ''}
                        onChange={(e) => setFormData({ ...formData, contractHoursPerWeek: parseFloat(e.target.value) })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Vrije dagen/uren per jaar <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.5"
                          value={formData.annualLeaveDaysOrHours || ''}
                          onChange={(e) => setFormData({ ...formData, annualLeaveDaysOrHours: parseFloat(e.target.value) })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                          required
                        />
                        <button
                          type="button"
                          onClick={calculateAnnualLeave}
                          className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs hover:bg-slate-200 whitespace-nowrap"
                          title="Bereken automatisch op basis van startdatum"
                        >
                          Bereken
                        </button>
                      </div>
                    </div>
                    <DatePicker
                      label="Startdatum dienstverband"
                      value={formData.employmentStartDate || ''}
                      onChange={(date) => setFormData({ ...formData, employmentStartDate: date })}
                      required
                    />
                  </div>

                  {/* Verlof Saldo */}
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-slate-900 mb-3">Huidig Verlof Saldo</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Wettelijk (min. 20 dagen)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={formData.leaveBalanceLegal || ''}
                          onChange={(e) => setFormData({ ...formData, leaveBalanceLegal: parseFloat(e.target.value) || 0 })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Bovenwettelijk (extra)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={formData.leaveBalanceExtra || ''}
                          onChange={(e) => setFormData({ ...formData, leaveBalanceExtra: parseFloat(e.target.value) || 0 })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Overdracht vorig jaar
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={formData.leaveBalanceCarryover || ''}
                          onChange={(e) => setFormData({ ...formData, leaveBalanceCarryover: parseFloat(e.target.value) || 0 })}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      Totaal saldo: {((formData.leaveBalanceLegal || 0) + (formData.leaveBalanceExtra || 0) + (formData.leaveBalanceCarryover || 0)).toFixed(1)} dagen
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.hasFixedTermContract || false}
                        onChange={(e) => setFormData({ ...formData, hasFixedTermContract: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm font-medium text-slate-700">Contract voor bepaalde tijd</span>
                    </label>
                  </div>

                  {formData.hasFixedTermContract && (
                    <div className="mt-4">
                      <DatePicker
                        label="Einddatum dienstverband"
                        value={formData.employmentEndDate || ''}
                        onChange={(date) => setFormData({ ...formData, employmentEndDate: date })}
                      />
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Werkdagen <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWorkingDay(day)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium ${
                            (formData.workingDays || []).includes(day)
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Planning instellingen */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Uren per dag (planning)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        step="0.5"
                        value={formData.planningHoursPerDay || 8}
                        onChange={(e) => setFormData({ ...formData, planningHoursPerDay: Number(e.target.value) })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">Aantal uren per werkdag voor planning</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Kleur (planning)
                      </label>
                      <input
                        type="color"
                        value={formData.color || '#4f46e5'}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full h-10 border border-slate-300 rounded-lg px-1"
                      />
                      <p className="text-xs text-slate-500 mt-1">Kleur in de planning kalender</p>
                    </div>
                  </div>
                </div>

                {/* Contactgegevens */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-slate-900 mb-3">Contactgegevens</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Telefoon</label>
                      <input
                        type="tel"
                        value={formData.phoneNumber || ''}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Privé Email</label>
                      <input
                        type="email"
                        value={formData.privateEmail || ''}
                        onChange={(e) => setFormData({ ...formData, privateEmail: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="privé@email.com"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">IBAN</label>
                      <input
                        type="text"
                        value={formData.iban || ''}
                        onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="NL00 BANK 0000 0000 00"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
                      <input
                        type="text"
                        value={formData.address || ''}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Postcode</label>
                      <input
                        type="text"
                        value={formData.postalCode || ''}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Plaats</label>
                      <input
                        type="text"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Land</label>
                      <input
                        type="text"
                        value={formData.country || 'Nederland'}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Noodcontact */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-slate-900 mb-3">Noodcontact</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Naam</label>
                      <input
                        type="text"
                        value={formData.emergencyContactName || ''}
                        onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Relatie</label>
                      <input
                        type="text"
                        value={formData.emergencyContactRelation || ''}
                        onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="bijv. Partner, Ouder"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Telefoon</label>
                      <input
                        type="tel"
                        value={formData.emergencyContactPhone || ''}
                        onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.emergencyContactEmail || ''}
                        onChange={(e) => setFormData({ ...formData, emergencyContactEmail: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Notities */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-slate-900 mb-3">HR Notities</h4>
                  <textarea
                    value={formData.hrNotes || ''}
                    onChange={(e) => setFormData({ ...formData, hrNotes: e.target.value })}
                    rows={4}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Interne notities, afspraken, etc."
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg p-12 text-center text-slate-500">
              Selecteer een medewerker om de gegevens te bekijken en bewerken
            </div>
          )}
        </div>
      </div>

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Nieuwe Medewerker</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="naam@bedrijf.nl"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Wachtwoord <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Minimaal 6 tekens"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Voornaam</label>
                  <input
                    type="text"
                    value={newUserData.firstName}
                    onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Achternaam</label>
                  <input
                    type="text"
                    value={newUserData.lastName}
                    onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  required
                >
                  <option value="MONTEUR">MONTEUR</option>
                  <option value="MAGAZIJN">MAGAZIJN</option>
                  <option value="MANAGEMENT">MANAGEMENT</option>
                  <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewUserModal(false)
                  setNewUserData({ email: '', password: '', firstName: '', lastName: '', role: 'MONTEUR' })
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Annuleren
              </button>
              <button
                onClick={handleCreateUser}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Aanmaken...' : 'Aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
