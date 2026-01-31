'use client'

import { normalizeLicensePlate } from '@/lib/license-plate'
import type { Vehicle, Customer } from '../types'

interface VehicleSelectModalsProps {
  showVehicleSelectModal: boolean
  existingVehicleConflict: any
  newVehicleMode: boolean
  customerVehiclesList: any[]
  newVehicleLicensePlate: string
  newVehicleMake: string
  newVehicleModel: string
  selectedCustomer: Customer | null | undefined
  setNewVehicleLicensePlate: (value: string) => void
  setNewVehicleMake: (value: string) => void
  setNewVehicleModel: (value: string) => void
  setNewVehicleMode: (value: boolean) => void
  setExistingVehicleConflict: (value: any) => void
  handleSelectExistingVehicle: (vehicle: any) => void
  handleNewVehicleForCustomer: () => void
  handleCreateNewVehicle: () => void
  handleCancelVehicleSelect: () => void
  handleTransferVehicleOwnership: () => void
}

export function VehicleSelectModals({
  showVehicleSelectModal,
  existingVehicleConflict,
  newVehicleMode,
  customerVehiclesList,
  newVehicleLicensePlate,
  newVehicleMake,
  newVehicleModel,
  selectedCustomer,
  setNewVehicleLicensePlate,
  setNewVehicleMake,
  setNewVehicleModel,
  setNewVehicleMode,
  setExistingVehicleConflict,
  handleSelectExistingVehicle,
  handleNewVehicleForCustomer,
  handleCreateNewVehicle,
  handleCancelVehicleSelect,
  handleTransferVehicleOwnership,
}: VehicleSelectModalsProps) {
  return (
    <>
      {/* Vehicle Select Modal - Multiple vehicles or new vehicle */}
      {showVehicleSelectModal && !existingVehicleConflict ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              {newVehicleMode ? 'Nieuw voertuig toevoegen' : 'Selecteer voertuig'}
            </h3>
            
            {!newVehicleMode ? (
              <>
                <p className="mt-2 text-sm text-slate-600">
                  Deze klant heeft meerdere voertuigen. Selecteer er één:
                </p>
                <div className="mt-4 max-h-60 space-y-2 overflow-y-auto">
                  {customerVehiclesList.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => handleSelectExistingVehicle(vehicle)}
                      className="w-full rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50"
                    >
                      <div className="font-medium text-slate-900">
                        {vehicle.make || vehicle.brand} {vehicle.model}
                      </div>
                      <div className="text-sm text-slate-600">
                        {vehicle.licensePlate ? normalizeLicensePlate(vehicle.licensePlate) : 'Geen kenteken'}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={handleNewVehicleForCustomer}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    + Nieuwe auto
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelVehicleSelect}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Annuleren
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Kenteken <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newVehicleLicensePlate}
                      onChange={(e) => setNewVehicleLicensePlate(e.target.value.toUpperCase())}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="XX-XX-XX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Merk</label>
                    <input
                      type="text"
                      value={newVehicleMake}
                      onChange={(e) => setNewVehicleMake(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Bijv. Toyota"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Model</label>
                    <input
                      type="text"
                      value={newVehicleModel}
                      onChange={(e) => setNewVehicleModel(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                      placeholder="Bijv. Yaris"
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCreateNewVehicle}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Toevoegen
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVehicleMode(false)}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Terug
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Vehicle Ownership Conflict Modal */}
      {existingVehicleConflict ? (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Voertuig bestaat al</h3>
            <p className="mt-2 text-sm text-slate-600">
              Het kenteken <strong>{normalizeLicensePlate(existingVehicleConflict.licensePlate)}</strong> 
              {' '}({existingVehicleConflict.make || existingVehicleConflict.brand} {existingVehicleConflict.model}) 
              is al geregistreerd bij een andere klant.
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">Huidige eigenaar:</p>
              <p className="text-sm text-amber-800">
                {existingVehicleConflict.customer?.name || 'Onbekende klant'}
              </p>
            </div>
            <p className="mt-3 text-sm text-slate-700">
              Is <strong>{selectedCustomer?.name}</strong> de nieuwe eigenaar van dit voertuig?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleTransferVehicleOwnership}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Ja, eigenaar wijzigen
              </button>
              <button
                type="button"
                onClick={() => {
                  setExistingVehicleConflict(null)
                  setNewVehicleLicensePlate('')
                }}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Nee, annuleren
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
