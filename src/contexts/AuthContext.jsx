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
        // Get initial session
        async function initSession() {
            try {
                const currentSession = await getSession()
                setSession(currentSession)
                const currentUser = currentSession?.user || null
                setUser(currentUser)

                if (currentUser) {
                    const profile = await fetchProfile(currentUser.id)
                    setUserProfile(profile)
                }
            } catch (error) {
                console.error('Error getting session:', error)
            } finally {
                setLoading(false)
            }
        }

        initSession()

        // Listen for auth changes
        const { data: { subscription } } = onAuthStateChange(async (event, newSession) => {
            console.log('Auth state changed:', event)
            setSession(newSession)
            const newUser = newSession?.user || null
            setUser(newUser)

            if (newUser) {
                const profile = await fetchProfile(newUser.id)
                setUserProfile(profile)
            } else {
                setUserProfile(null)
            }

            setLoading(false)
        })

        return () => {
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
        try {
            await supabaseSignOut()
            setUser(null)
            setUserProfile(null)
            setSession(null)
        } catch (error) {
            console.error('Error signing out:', error)
            throw error
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
