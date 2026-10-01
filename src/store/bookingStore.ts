import { create } from 'zustand'
import type { BookingState, PublicService } from '@/types'

interface BookingStore extends BookingState {
  setService: (service: PublicService) => void
  setDate: (date: Date) => void
  setSlot: (slot: string | null) => void
  setClientName: (name: string) => void
  setClientPhone: (phone: string) => void
  reset: () => void
}

const INITIAL_STATE: BookingState = {
  selectedService: null,
  selectedDate: null,
  selectedSlot: null,
  clientName: '',
  clientPhone: '',
}

export const useBookingStore = create<BookingStore>((set) => ({
  ...INITIAL_STATE,
  setService: (service) => set({ selectedService: service, selectedDate: null, selectedSlot: null }),
  setDate: (date) => set({ selectedDate: date, selectedSlot: null }),
  setSlot: (slot) => set({ selectedSlot: slot }),
  setClientName: (name) => set({ clientName: name }),
  setClientPhone: (phone) => set({ clientPhone: phone }),
  reset: () => set(INITIAL_STATE),
}))
