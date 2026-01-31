'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'

export function useVehicleSelection(
  customerId: string,
  setVehicleId: (id: string) => void,
  setSelectedVehicleData: (data: any) => void,
  raiseError: (msg: string) => void
) {
  const [showVehicleSelectModal, setShowVehicleSelectModal] = useState(false)
  const [customerVehiclesList, setCustomerVehiclesList] = useState<any[]>([])
  const [newVehicleMode, setNewVehicleMode] = useState(false)
  const [newVehicleLicensePlate, setNewVehicleLicensePlate] = useState('')
  const [newVehicleMake, setNewVehicleMake] = useState('')
  const [newVehicleModel, setNewVehicleModel] = useState('')
  const [existingVehicleConflict, setExistingVehicleConflict] = useState<any>(null)

  const checkCustomerVehicles = async (customerId: string) => {
    try {
      const response = await apiFetch(`/api/vehicles?customerId=${customerId}`)
      if (response.success && response.items) {
        const customerVehicles = response.items
        
        if (customerVehicles.length === 0) {
          console.log('Customer has no vehicles')
        } else if (customerVehicles.length === 1) {
          const vehicle = customerVehicles[0]
          console.log('Auto-selecting single vehicle:', vehicle.id)
          setVehicleId(vehicle.id)
          setSelectedVehicleData(vehicle)
        } else {
          console.log('Customer has multiple vehicles:', customerVehicles.length)
          setCustomerVehiclesList(customerVehicles)
          setShowVehicleSelectModal(true)
        }
      }
    } catch (error) {
      console.error('Error fetching customer vehicles:', error)
    }
  }

  const handleSelectExistingVehicle = (vehicle: any) => {
    setVehicleId(vehicle.id)
    setSelectedVehicleData(vehicle)
    setShowVehicleSelectModal(false)
    setCustomerVehiclesList([])
  }

  const handleNewVehicleForCustomer = () => {
    setNewVehicleMode(true)
  }

  const handleCreateNewVehicle = async () => {
    if (!newVehicleLicensePlate.trim()) {
      raiseError('Kenteken is verplicht')
      return
    }
    
    try {
      const checkResponse = await apiFetch(`/api/vehicles?search=${encodeURIComponent(newVehicleLicensePlate)}`)
      if (checkResponse.success && checkResponse.items && checkResponse.items.length > 0) {
        const existingVehicle = checkResponse.items[0]
        if (existingVehicle.customerId && existingVehicle.customerId !== customerId) {
          setExistingVehicleConflict(existingVehicle)
          return
        }
      }
      
      const createResponse = await apiFetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: newVehicleLicensePlate,
          make: newVehicleMake || null,
          model: newVehicleModel || null,
          customerId: customerId,
        }),
      })
      
      if (createResponse.success && createResponse.item) {
        const newVehicle = createResponse.item
        setVehicleId(newVehicle.id)
        setSelectedVehicleData(newVehicle)
        setShowVehicleSelectModal(false)
        setNewVehicleMode(false)
        setNewVehicleLicensePlate('')
        setNewVehicleMake('')
        setNewVehicleModel('')
        setCustomerVehiclesList([])
      } else {
        raiseError(createResponse.error || 'Fout bij aanmaken voertuig')
      }
    } catch (error: any) {
      console.error('Error creating vehicle:', error)
      raiseError(error.message || 'Fout bij aanmaken voertuig')
    }
  }

  const handleTransferVehicleOwnership = async () => {
    if (!existingVehicleConflict) return
    
    try {
      const updateResponse = await apiFetch(`/api/vehicles/${existingVehicleConflict.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId,
        }),
      })
      
      if (updateResponse.success) {
        const updatedVehicle = { ...existingVehicleConflict, customerId: customerId }
        setVehicleId(updatedVehicle.id)
        setSelectedVehicleData(updatedVehicle)
        setShowVehicleSelectModal(false)
        setNewVehicleMode(false)
        setExistingVehicleConflict(null)
        setNewVehicleLicensePlate('')
        setNewVehicleMake('')
        setNewVehicleModel('')
        setCustomerVehiclesList([])
      } else {
        raiseError(updateResponse.error || 'Fout bij overdragen eigenaar')
      }
    } catch (error: any) {
      console.error('Error transferring ownership:', error)
      raiseError(error.message || 'Fout bij overdragen eigenaar')
    }
  }

  const handleCancelVehicleSelect = () => {
    setShowVehicleSelectModal(false)
    setNewVehicleMode(false)
    setExistingVehicleConflict(null)
    setNewVehicleLicensePlate('')
    setNewVehicleMake('')
    setNewVehicleModel('')
    setCustomerVehiclesList([])
  }

  return {
    showVehicleSelectModal,
    customerVehiclesList,
    newVehicleMode,
    newVehicleLicensePlate,
    newVehicleMake,
    newVehicleModel,
    existingVehicleConflict,
    setNewVehicleLicensePlate,
    setNewVehicleMake,
    setNewVehicleModel,
    setNewVehicleMode,
    setExistingVehicleConflict,
    checkCustomerVehicles,
    handleSelectExistingVehicle,
    handleNewVehicleForCustomer,
    handleCreateNewVehicle,
    handleTransferVehicleOwnership,
    handleCancelVehicleSelect,
  }
}
