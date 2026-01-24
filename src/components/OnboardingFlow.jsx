import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowRight, Sparkles, Camera, AtSign, X, Loader2, ChevronLeft,
    Mail, Lock, Eye, EyeOff
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const STEPS = {
    AUTH: 'auth',
    WELCOME_BACK: 'welcome_back',
    NAME: 'name',
    PROFILE_VIBE: 'profile_vibe',
    DONE: 'done'
}

export default function OnboardingFlow({ isOpen, onClose, onComplete }) {
    const [step, setStep] = useState(STEPS.AUTH)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [authMode, setAuthMode] = useState('login')

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const [existingUser, setExistingUser] = useState(null)
    const [userData, setUserData] = useState({
        name: '',
        username: '',
        avatarUrl: ''
    })

    const handleGoogleSignIn = async () => {
        setLoading(true)
        setError('')
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            })
            if (error) throw error
        } catch (err) {
            setError(err.message || 'Failed to sign in with Google')
            setLoading(false)
        }
    }

    const handleEmailAuth = async (e) => {
        e.preventDefault()
        if (!email || !password) {
            setError('Please fill in all fields')
            return
        }

        setLoading(true)
        setError('')

        try {
            if (authMode === 'login') {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error

                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('user_id', data.user.id)
                    .single()

                if (profile?.onboarding_complete) {
                    setExistingUser(profile)
                    setStep(STEPS.WELCOME_BACK)
                } else {
                    setUserData(prev => ({ ...prev, name: profile?.name || '' }))
                    setStep(STEPS.NAME)
                }
            } else {
                const { data, error } = await supabase.auth.signUp({ email, password })
                if (error) throw error

                if (data.user?.identities?.length === 0) {
                    setError('An account with this email already exists')
                } else {
                    setSuccess('Account created!')
                    setTimeout(() => setStep(STEPS.NAME), 800)
                }
            }
        } catch (err) {
            setError(err.message || 'Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveName = () => {
        if (!userData.name.trim()) {
            setError('Please enter your name')
            return
        }
        setError('')
        setStep(STEPS.PROFILE_VIBE)
    }

    const handleFinalSave = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase.from('user_profiles').upsert({
                    user_id: user.id,
                    name: userData.name,
                    username: userData.username || null,
                    avatar_url: userData.avatarUrl || null,
                    onboarding_complete: true
                })
            }
            setStep(STEPS.DONE)
        } catch (err) {
            console.error('Error saving profile:', err)
            setStep(STEPS.DONE)
        } finally {
            setLoading(false)
        }
    }

    const handleComplete = () => {
        onComplete?.()
        onClose()
    }

    if (!isOpen) return null

    const slideVariants = {
        enter: { x: 50, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -50, opacity: 0 }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 1000, display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                {step !== STEPS.AUTH && step !== STEPS.DONE && step !== STEPS.WELCOME_BACK ? (
                    <button
                        onClick={() => {
                            if (step === STEPS.PROFILE_VIBE) setStep(STEPS.NAME)
                            else if (step === STEPS.NAME) setStep(STEPS.AUTH)
                        }}
                        className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                ) : <div />}
                <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm">
                    <X size={20} />
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
                <AnimatePresence mode="wait">
                    {/* AUTH */}
                    {step === STEPS.AUTH && (
                        <motion.div key="auth" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                                    <Sparkles size={40} style={{ color: 'hsl(var(--accent))', marginBottom: '1rem' }} />
                                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                                        {authMode === 'login' ? 'Welcome Back' : 'Join Wardrobe AI'}
                                    </h1>
                                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                                        AI-powered outfit suggestions ✨
                                    </p>
                                </div>

                                <button onClick={handleGoogleSignIn} disabled={loading} className="btn btn-outline w-full" style={{ marginBottom: '1rem', gap: '0.5rem' }}>
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                        <svg width="18" height="18" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                    )}
                                    Continue with Google
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <div style={{ flex: 1, height: '1px', background: 'hsl(var(--border))' }} />
                                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>or</span>
                                    <div style={{ flex: 1, height: '1px', background: 'hsl(var(--border))' }} />
                                </div>

                                {error && <div style={{ background: 'hsl(0 84% 95%)', color: 'hsl(0 84% 40%)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>{error}</div>}
                                {success && <div style={{ background: 'hsl(var(--green-100))', color: 'hsl(var(--green-600))', padding: '0.75rem', borderRadius: 'var(--radius-lg)', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>{success}</div>}

                                <form onSubmit={handleEmailAuth}>
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <label className="label" style={{ fontSize: '0.75rem' }}>Email</label>
                                        <div style={{ position: 'relative' }}>
                                            <Mail size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                            <input type="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: '2.5rem' }} />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label className="label" style={{ fontSize: '0.75rem' }}>Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                            <input type={showPassword ? 'text' : 'password'} className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }} />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))' }}>
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                                    </button>
                                </form>

                                <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>
                                    {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                                    <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: 'hsl(var(--accent))', fontWeight: 600, cursor: 'pointer' }}>
                                        {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                                    </button>
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* WELCOME BACK */}
                    {step === STEPS.WELCOME_BACK && (
                        <motion.div key="welcome" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</div>
                            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Hey {existingUser?.name?.split(' ')[0] || 'there'}!</h1>
                            <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '2rem' }}>Your closet missed you 👀</p>
                            <button className="btn btn-primary btn-lg w-full" onClick={handleComplete}>
                                Let's get styled <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}

                    {/* NAME */}
                    {step === STEPS.NAME && (
                        <motion.div key="name" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>What do we call you?</h1>
                                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>This shows up on your profile</p>
                                </div>
                                {error && <div style={{ background: 'hsl(0 84% 95%)', color: 'hsl(0 84% 40%)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
                                <label className="label">Your Name</label>
                                <input type="text" className="input" placeholder="e.g. Priya" value={userData.name} onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))} />
                            </div>
                            <button className="btn btn-primary btn-lg w-full" onClick={handleSaveName} disabled={!userData.name.trim()}>
                                Continue <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}

                    {/* PROFILE VIBE */}
                    {step === STEPS.PROFILE_VIBE && (
                        <motion.div key="profile" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Set your vibe</h1>
                                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>Or skip – no pressure!</p>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'hsl(var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px dashed hsl(var(--border))' }}>
                                        <Camera size={24} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                    </div>
                                </div>
                                <label className="label">Username (optional)</label>
                                <div style={{ position: 'relative' }}>
                                    <AtSign size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                    <input type="text" className="input" placeholder="yourhandle" value={userData.username} onChange={(e) => setUserData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s/g, '') }))} style={{ paddingLeft: '2.5rem' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <button className="btn btn-primary btn-lg w-full" onClick={handleFinalSave} disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" /> : 'Save & continue'}
                                </button>
                                <button className="btn btn-ghost w-full" onClick={handleFinalSave}>
                                    Skip for now
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* DONE */}
                    {step === STEPS.DONE && (
                        <motion.div key="done" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
                            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>You're all set!</h1>
                            <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '2rem' }}>Let's find your perfect outfit</p>
                            <button className="btn btn-primary btn-lg w-full" onClick={handleComplete}>
                                Start exploring <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
