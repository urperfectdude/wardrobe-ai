
import { supabase } from '../lib/supabase'

// Get session with timeout to prevent hanging
export async function getAuthSession(timeoutMs = 5000) {
    // First try localStorage for immediate session (faster, non-blocking)
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        if (supabaseUrl) {
            const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
            const key = `sb-${projectRef}-auth-token`
            const stored = localStorage.getItem(key)
            if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed?.access_token && parsed?.user) {
                    // Check if token is not expired
                    const expiresAt = parsed.expires_at
                    if (!expiresAt || expiresAt * 1000 > Date.now()) {
                        return parsed
                    }
                }
            }
        }
    } catch (e) {
        // localStorage failed, continue to supabase client
    }

    // Fallback to supabase client with timeout
    if (!supabase) return null

    try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session timeout')), timeoutMs)
        )

        const { data } = await Promise.race([sessionPromise, timeoutPromise])
        return data?.session || null
    } catch (e) {
        console.warn('Error getting session:', e)
        return null
    }
}
