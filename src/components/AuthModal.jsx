import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Loader2, X, Eye, EyeOff, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function AuthModal({ isOpen, onClose }) {
    const { signInWithGoogle } = useAuth()
    const [mode, setMode] = useState('login') // 'login' or 'signup'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const resetForm = () => {
        setEmail('')
        setPassword('')
        setConfirmPassword('')
        setFullName('')
        setError('')
        setSuccess('')
    }

    const handleGoogleSignIn = async () => {
        setLoading(true)
        setError('')
        try {
            await signInWithGoogle()
        } catch (err) {
            setError('Failed to sign in with Google')
            setLoading(false)
        }
    }

    const handleEmailLogin = async (e) => {
        e.preventDefault()
        if (!email || !password) {
            setError('Please fill in all fields')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) throw error

            onClose()
        } catch (err) {
            setError(err.message || 'Failed to sign in')
        } finally {
            setLoading(false)
        }
    }

    const handleEmailSignup = async (e) => {
        e.preventDefault()
        if (!email || !password || !fullName) {
            setError('Please fill in all fields')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)
        setError('')

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            })

            if (error) throw error

            setSuccess('Check your email to confirm your account!')
            resetForm()
        } catch (err) {
            setError(err.message || 'Failed to sign up')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="card"
                    style={{ maxWidth: '380px', width: '100%', padding: '1.5rem' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <Sparkles size={20} style={{ color: 'hsl(var(--accent))' }} />
                                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                            </h2>
                            <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                                {mode === 'login' ? 'Sign in to your account' : 'Join Wardrobe AI'}
                            </p>
                        </div>
                        <button className="btn btn-icon btn-ghost btn-sm" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* Google Sign In - Primary */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="btn btn-outline w-full"
                        style={{ marginBottom: '1rem', gap: '0.5rem' }}
                    >
                        {loading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        Continue with Google
                    </button>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ flex: 1, height: '1px', background: 'hsl(var(--border))' }} />
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>or</span>
                        <div style={{ flex: 1, height: '1px', background: 'hsl(var(--border))' }} />
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                        <div style={{
                            background: 'hsl(0 84% 95%)',
                            color: 'hsl(0 84% 40%)',
                            padding: '0.625rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '0.75rem',
                            fontSize: '0.8125rem'
                        }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            background: 'hsl(var(--green-100))',
                            color: 'hsl(var(--green-600))',
                            padding: '0.625rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '0.75rem',
                            fontSize: '0.8125rem'
                        }}>
                            {success}
                        </div>
                    )}

                    {/* Email Form */}
                    <form onSubmit={mode === 'login' ? handleEmailLogin : handleEmailSignup}>
                        {mode === 'signup' && (
                            <div style={{ marginBottom: '0.75rem' }}>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Your name"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        style={{ paddingLeft: '2.5rem' }}
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '0.75rem' }}>
                            <label className="label" style={{ fontSize: '0.75rem' }}>Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                <input
                                    type="email"
                                    className="input"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{ paddingLeft: '2.5rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: mode === 'signup' ? '0.75rem' : '1rem' }}>
                            <label className="label" style={{ fontSize: '0.75rem' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {mode === 'signup' && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label" style={{ fontSize: '0.75rem' }}>Confirm Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="input"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        style={{ paddingLeft: '2.5rem' }}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                mode === 'login' ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Toggle mode */}
                    <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>
                        {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                        <button
                            type="button"
                            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); resetForm() }}
                            style={{ background: 'none', border: 'none', color: 'hsl(var(--accent))', fontWeight: 600, cursor: 'pointer' }}
                        >
                            {mode === 'login' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
