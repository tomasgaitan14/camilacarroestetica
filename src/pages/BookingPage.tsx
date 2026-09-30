import { useState } from 'react'
import { Step1Service } from '@/components/booking/Step1Service'
import { Step3DateTime } from '@/components/booking/Step3DateTime'
import { Step4Confirm } from '@/components/booking/Step4Confirm'
import { SuccessScreen } from '@/components/booking/SuccessScreen'
import { StepIndicator } from '@/components/booking/StepIndicator'
import type { BookingConfirmation } from '@/types'

const TOTAL_STEPS = 3

export default function BookingPage() {
  const [step, setStep] = useState(1)
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null)

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS))
  const back = () => setStep(s => Math.max(s - 1, 1))

  function handleNewBooking() {
    setConfirmation(null)
    setStep(1)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-100 px-4 py-3 flex items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Camila Carro"
            className="w-8 h-8 rounded-full object-cover"
            onError={e => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="font-semibold text-neutral-900 text-sm">Camila Carro Estética</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {confirmation ? (
          <SuccessScreen confirmation={confirmation} onNewBooking={handleNewBooking} />
        ) : (
          <>
            <StepIndicator current={step} total={TOTAL_STEPS} />

            {step === 1 && <Step1Service onNext={next} />}
            {step === 2 && <Step3DateTime onNext={next} onBack={back} />}
            {step === 3 && <Step4Confirm onBack={back} onSuccess={setConfirmation} />}
          </>
        )}
      </main>
    </div>
  )
}
