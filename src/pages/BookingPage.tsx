import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Step1Service } from '@/components/booking/Step1Service'
import { Step2Professional } from '@/components/booking/Step2Professional'
import { Step3DateTime } from '@/components/booking/Step3DateTime'
import { Step4Confirm } from '@/components/booking/Step4Confirm'
import { SuccessScreen } from '@/components/booking/SuccessScreen'
import { StepIndicator } from '@/components/booking/StepIndicator'

const TOTAL_STEPS = 4

export default function BookingPage() {
  const [step, setStep] = useState(1)
  const [confirmedId, setConfirmedId] = useState<string | null>(null)

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS))
  const back = () => setStep(s => Math.max(s - 1, 1))

  function handleSuccess(id: string) {
    setConfirmedId(id)
  }

  function handleNewBooking() {
    setConfirmedId(null)
    setStep(1)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {/* Logo placeholder */}
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
            <span className="text-brand-500 text-xs font-bold">CC</span>
          </div>
          <span className="font-semibold text-neutral-900 text-sm">Camila Carro Estética</span>
        </div>
        <Link
          to="/cancel"
          className="text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          Cancelar o reprogramar
        </Link>
      </header>

      {/* Contenido */}
      <main className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        {confirmedId ? (
          <SuccessScreen appointmentId={confirmedId} onNewBooking={handleNewBooking} />
        ) : (
          <>
            <StepIndicator current={step} total={TOTAL_STEPS} />

            {step === 1 && <Step1Service onNext={next} />}
            {step === 2 && <Step2Professional onNext={next} onBack={back} />}
            {step === 3 && <Step3DateTime onNext={next} onBack={back} />}
            {step === 4 && <Step4Confirm onBack={back} onSuccess={handleSuccess} />}
          </>
        )}
      </main>
    </div>
  )
}
