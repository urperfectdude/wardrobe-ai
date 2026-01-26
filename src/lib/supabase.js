import { createClient } from '@supabase/supabase-js'

// Supabase Configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured.')
}

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: `sb-${supabaseUrl.replace('https://', '').split('.')[0]}-auth-token`,
            storage: window?.localStorage
        }
    })
    : null

// Check if Supabase is available
export const isSupabaseConfigured = () => {
    return supabase !== null
}

// ============================================
// GOOGLE OAUTH
// ============================================

export async function signInWithGoogle() {
    if (!supabase) return { error: new Error('Supabase not configured') }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent'
            }
        }
    })

    return { data, error }
}

// ============================================
// EMAIL/PASSWORD AUTH (backup)
// ============================================

export async function signUp(email, password) {
    if (!supabase) return { error: new Error('Supabase not configured') }
    return await supabase.auth.signUp({ email, password })
}

export async function signIn(email, password) {
    if (!supabase) return { error: new Error('Supabase not configured') }
    return await supabase.auth.signInWithPassword({ email, password })
}

// ============================================
// COMMON AUTH FUNCTIONS
// ============================================

export async function signOut() {
    if (!supabase) return { error: new Error('Supabase not configured') }
    return await supabase.auth.signOut()
}

export async function getCurrentUser() {
    if (!supabase) return null
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export async function getSession() {
    if (!supabase) return null
    const { data: { session } } = await supabase.auth.getSession()
    return session
}

export function onAuthStateChange(callback) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => { } } } }
    return supabase.auth.onAuthStateChange(callback)
}

export default supabase
