import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, onAuthStateChange, signInWithGoogle, signOut as supabaseSignOut, getSession } from '../lib/supabase'

const AuthContext = createContext({
    user: null,
    userProfile: null,
    session: null,
    loading: true,
    signInWithGoogle: async () => { },
    signOut: async () => { },
    refreshProfile: async () => { }
})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    // Fetch user profile from database
    const fetchProfile = async (userId) => {
        if (!userId) return null
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error)
            }
            return data
        } catch (err) {
            console.error('Error fetching profile:', err)
            return null
        }
    }

    const refreshProfile = async () => {
        if (user?.id) {
            const profile = await fetchProfile(user.id)
            setUserProfile(profile)
        }
    }

    useEffect(() => {
        let isMounted = true

        // 1. Manual Session Hydration (Bypass client hang)
        const hydrateSession = () => {
            try {
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                if (!supabaseUrl) return false

                // Extract project ref (e.g., https://xyz.supabase.co -> xyz)
                const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
                const key = `sb-${projectRef}-auth-token`
                const stored = localStorage.getItem(key)

                if (stored) {
                    const manualSession = JSON.parse(stored)
                    console.log('Manual hydration attempt found session for:', manualSession?.user?.id)
                    if (manualSession?.user && isMounted) {
                        setSession(manualSession)
                        setUser(manualSession.user)

                        // Try fetching profile non-blocking
                        if (manualSession.user.id) {
                            fetchProfile(manualSession.user.id).then(p => {
                                if (isMounted && p) setUserProfile(p)
                            })
                        }
                        setLoading(false)
                        return true
                    }
                }
            } catch (e) {
                console.warn('Manual hydration error:', e)
            }
            return false
        }

        const hydrated = hydrateSession()

        // Safety timeout (only if not hydrated)
        const safetyTimeout = setTimeout(() => {
            if (isMounted && loading) {
                console.warn('Auth initialization timed out, forcing load completion')
                setLoading(false)
            }
        }, 3000)

        // 2. Listen for auth changes (Keep Supabase client logic for updates)
        const { data: { subscription } } = onAuthStateChange(async (event, newSession) => {
            if (!isMounted) return

            console.log('Auth state changed:', event)

            // If we manually hydrated and this event matches, just update state
            setSession(newSession)
            setUser(newSession?.user || null)

            if (newSession?.user) {
                try {
                    // Don't refetch if we already have the correct profile
                    if (userProfile?.user_id !== newSession.user.id) {
                        const profile = await fetchProfile(newSession.user.id)
                        if (isMounted) setUserProfile(profile)
                    }
                } catch (err) {
                    console.warn('Profile fetch failed during state change:', err)
                }
            } else {
                setUserProfile(null)
            }

            if (isMounted) setLoading(false)
        })

        return () => {
            isMounted = false
            clearTimeout(safetyTimeout)
            subscription?.unsubscribe()
        }
    }, [])

    const handleSignInWithGoogle = async () => {
        setLoading(true)
        try {
            const { error } = await signInWithGoogle()
            if (error) throw error
        } catch (error) {
            console.error('Error signing in:', error)
            setLoading(false)
            throw error
        }
    }

    const handleSignOut = async () => {
        // Clear state immediately (don't wait for API)
        setUser(null)
        setUserProfile(null)
        setSession(null)

        // Clear localStorage manually (in case Supabase client hangs)
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
            if (supabaseUrl) {
                const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
                const key = `sb-${projectRef}-auth-token`
                localStorage.removeItem(key)
                console.log('Cleared auth token from localStorage')
            }
        } catch (e) {
            console.warn('Error clearing localStorage:', e)
        }

        // Try to sign out via Supabase with timeout (don't block on this)
        try {
            const signOutPromise = supabaseSignOut()
            const timeoutPromise = new Promise((resolve) =>
                setTimeout(() => resolve({ error: new Error('SignOut timeout') }), 2000)
            )
            await Promise.race([signOutPromise, timeoutPromise])
        } catch (error) {
            console.error('Error during Supabase signOut:', error)
            // Don't throw - user is already logged out locally
        }
    }

    const value = {
        user,
        userProfile,
        session,
        loading,
        signInWithGoogle: handleSignInWithGoogle,
        signOut: handleSignOut,
        refreshProfile
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export default AuthContext
