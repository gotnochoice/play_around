'use client'

import { useState } from 'react'
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen'
import { ChatInterface } from '@/components/chat/ChatInterface'
import type { OnboardingData } from '@/types'

export function ChatPageClient() {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)

  if (!onboardingData) {
    return <OnboardingScreen onComplete={setOnboardingData} />
  }

  return <ChatInterface onboardingData={onboardingData} />
}
