import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import OnboardingFlow from './OnboardingFlow'
import { getIncompleteSteps } from './PreferencesFlow'
import { getPreferences } from '../utils/storage'

export default function OnboardingCheck() {
    const { user, userProfile, loading } = useAuth()
    const [showOnboarding, setShowOnboarding] = useState(false)

    useEffect(() => {
        const checkCompleteness = async () => {
            if (!loading && user && userProfile) {
                // Check if profile is marked as complete
                if (userProfile.onboarding_complete) return

                // Double check with preferences
                try {
                    const prefs = await getPreferences()
                    const incomplete = getIncompleteSteps(prefs, userProfile)
                    
                    if (incomplete.length > 0) {
                        setShowOnboarding(true)
                    }
                } catch (err) {
                    console.error('Error checking preferences completeness:', err)
                }
            }
        }

        checkCompleteness()
    }, [user, userProfile, loading])

    if (!showOnboarding) return null

    return (
        <OnboardingFlow
            isOpen={showOnboarding}
            onClose={() => setShowOnboarding(false)}
            onComplete={() => setShowOnboarding(false)}
        />
    )
}
