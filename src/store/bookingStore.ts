import { create } from 'zustand'
import type { BookingState } from '@/types'

interface BookingStore extends BookingState {
  setService: (id: string) => void
  setProfessional: (id: string) => void
  setDate: (date: Date) => void
  setSlot: (slot: string) => void
  setClientName: (name: string) => void
  setClientPhone: (phone: string) => void
  reset: () => void
}

const INITIAL_STATE: BookingState = {
  selectedServiceId: null,
  selectedProfessionalId: null,
  selectedDate: null,
  selectedSlot: null,
  clientName: '',
  clientPhone: '',
}

export const useBookingStore = create<BookingStore>((set) => ({
  ...INITIAL_STATE,
  setService: (id) => set({ selectedServiceId: id, selectedProfessionalId: null, selectedDate: null, selectedSlot: null }),
  setProfessional: (id) => set({ selectedProfessionalId: id, selectedDate: null, selectedSlot: null }),
  setDate: (date) => set({ selectedDate: date, selectedSlot: null }),
  setSlot: (slot) => set({ selectedSlot: slot }),
  setClientName: (name) => set({ clientName: name }),
  setClientPhone: (phone) => set({ clientPhone: phone }),
  reset: () => set(INITIAL_STATE),
}))
