'use client'

import { useState } from 'react'
import type { BusinessType, OnboardingData } from '@/types'

const BUSINESS_TYPES: { value: NonNullable<BusinessType>; label: string }[] = [
  { value: 'B2B_SAAS', label: 'B2B SaaS' },
  { value: 'CONSUMER_APP', label: 'Consumer App' },
  { value: 'MARKETPLACE', label: 'Marketplace' },
  { value: 'ECOMMERCE', label: 'E-commerce' },
  { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services' },
  { value: 'FINTECH', label: 'Fintech' },
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'MEDIA', label: 'Media / Content' },
  { value: 'AGRITECH', label: 'AgriTech' },
  { value: 'EDTECH', label: 'EdTech' },
  { value: 'HEALTHTECH', label: 'HealthTech' },
  { value: 'LOGISTICS', label: 'Logistics' },
]

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'NGN', label: 'NGN (₦)' },
  { value: 'KES', label: 'KES (KSh)' },
  { value: 'ZAR', label: 'ZAR (R)' },
  { value: 'INR', label: 'INR (₹)' },
  { value: 'CAD', label: 'CAD (C$)' },
  { value: 'AUD', label: 'AUD (A$)' },
  { value: 'SGD', label: 'SGD (S$)' },
  { value: 'AED', label: 'AED (د.إ)' },
  { value: 'GHS', label: 'GHS (₵)' },
]

interface OnboardingScreenProps {
  onComplete: (data: OnboardingData) => void
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-brand-navy focus:ring-2 focus:ring-brand-navy/10'

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [form, setForm] = useState({
    founderName: '',
    businessName: '',
    businessType: '' as BusinessType,
    businessDescription: '',
    currency: 'USD',
  })

  const isValid = form.founderName.trim() && form.businessName.trim() && form.businessType

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    onComplete({
      founderName: form.founderName.trim(),
      businessName: form.businessName.trim(),
      businessType: form.businessType,
      businessDescription: form.businessDescription.trim(),
      currency: form.currency,
    })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left brand panel */}
      <div className="hidden w-[400px] shrink-0 flex-col justify-between bg-brand-navy px-10 py-12 lg:flex">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue text-sm font-bold text-white">
              FD
            </div>
            <span className="font-semibold tracking-tight text-white">FounderDeck</span>
          </div>

          <h1 className="mt-12 text-3xl font-bold leading-snug text-white">
            Build the model investors actually want to see.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Answer a few questions. We turn your real numbers into a defensible financial model.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              'Unit economics built from your actual answers',
              'Runway and burn calculated automatically',
              'Assumptions you can stand behind in any room',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white/70">
                <span className="mt-0.5 shrink-0 text-brand-blue">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/25">
          Your data is used only to build your model. Never used to train AI.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto bg-white px-8 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-navy text-xs font-bold text-white">
              FD
            </div>
            <span className="font-semibold text-slate-800">FounderDeck</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Tell us about your business</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Takes 60 seconds. Saves hours of spreadsheet work.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Your first name
                </label>
                <input
                  type="text"
                  value={form.founderName}
                  onChange={(e) => setForm({ ...form, founderName: e.target.value })}
                  placeholder="Enny"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Business name
                </label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Carbi"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Business type
                </label>
                <select
                  value={form.businessType ?? ''}
                  onChange={(e) => setForm({ ...form, businessType: e.target.value as BusinessType })}
                  className={inputClass}
                  required
                >
                  <option value="" disabled>Select type</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Revenue currency
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className={inputClass}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                Business model{' '}
                <span className="font-normal text-slate-400">(one sentence, optional)</span>
              </label>
              <input
                type="text"
                value={form.businessDescription}
                onChange={(e) => setForm({ ...form, businessDescription: e.target.value })}
                placeholder="e.g. We broker used car sales between dealers and private buyers"
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={!isValid}
              className="mt-2 w-full rounded-lg bg-brand-navy py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Build my model →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
