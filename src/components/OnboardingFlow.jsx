import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    ArrowRight, Sparkles, X, Loader2, ChevronLeft,
    Mail, Lock, Eye, EyeOff, MapPin, User, Palette, Shirt
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { EXISTING_CATEGORY4, EXISTING_COLORS } from '../utils/openaiAnalysis'

const STEPS = {
    AUTH: 'auth',
    WELCOME_BACK: 'welcome_back',
    NAME: 'name',
    GENDER: 'gender',
    LOCATION: 'location',
    SIZES: 'sizes',
    STYLES: 'styles',
    COLORS: 'colors',
    DONE: 'done'
}

const STYLE_OPTIONS = EXISTING_CATEGORY4.slice(0, 18)
const COLOR_OPTIONS = [
    { name: 'Black', hex: '#1a1a1a' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Navy', hex: '#1e3a5f' },
    { name: 'Beige', hex: '#d4c5b0' },
    { name: 'Gray', hex: '#6b7280' },
    { name: 'Brown', hex: '#8B4513' },
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Red', hex: '#ef4444' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Purple', hex: '#a855f7' }
]

const TOP_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const BOTTOM_SIZES = ['26', '28', '30', '32', '34', '36', '38', '40']

export default function OnboardingFlow({ isOpen, onClose, onComplete }) {
    const navigate = useNavigate()
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
        gender: '',
        location: '',
        topSize: '',
        bottomSize: '',
        styles: [],
        colors: []
    })

    const handleGoogleSignIn = async () => {
        setLoading(true)
        setError('')
        try {
            if (!supabase) {
                setError('Authentication service not configured')
                setLoading(false)
                return
            }
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
            if (!supabase) {
                setError('Authentication service not configured')
                setLoading(false)
                return
            }
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

    const goNext = () => {
        const stepOrder = [STEPS.AUTH, STEPS.NAME, STEPS.GENDER, STEPS.LOCATION, STEPS.SIZES, STEPS.STYLES, STEPS.COLORS, STEPS.DONE]
        const currentIdx = stepOrder.indexOf(step)
        if (currentIdx < stepOrder.length - 1) {
            setStep(stepOrder[currentIdx + 1])
        }
    }

    const goBack = () => {
        const stepOrder = [STEPS.AUTH, STEPS.NAME, STEPS.GENDER, STEPS.LOCATION, STEPS.SIZES, STEPS.STYLES, STEPS.COLORS, STEPS.DONE]
        const currentIdx = stepOrder.indexOf(step)
        if (currentIdx > 0) {
            setStep(stepOrder[currentIdx - 1])
        }
    }

    const handleFinalSave = async () => {
        setLoading(true)
        try {
            if (!supabase) {
                setStep(STEPS.DONE)
                setLoading(false)
                return
            }
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Save profile
                await supabase.from('user_profiles').upsert({
                    user_id: user.id,
                    name: userData.name,
                    onboarding_complete: true
                })

                // Save preferences
                await supabase.from('user_preferences').upsert({
                    user_id: user.id,
                    gender: userData.gender,
                    location: userData.location,
                    top_size: userData.topSize,
                    bottom_size: userData.bottomSize,
                    preferred_styles: userData.styles,
                    preferred_colors: userData.colors
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
        navigate('/closet')
    }

    const toggleStyle = (style) => {
        setUserData(prev => {
            const current = prev.styles
            if (current.includes(style)) {
                return { ...prev, styles: current.filter(s => s !== style) }
            }
            if (current.length >= 3) return prev
            return { ...prev, styles: [...current, style] }
        })
    }

    const toggleColor = (color) => {
        setUserData(prev => {
            const current = prev.colors
            if (current.includes(color)) {
                return { ...prev, colors: current.filter(c => c !== color) }
            }
            if (current.length >= 3) return prev
            return { ...prev, colors: [...current, color] }
        })
    }

    if (!isOpen) return null

    const slideVariants = {
        enter: { x: 50, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -50, opacity: 0 }
    }

    const getProgress = () => {
        const steps = ['auth', 'name', 'gender', 'location', 'sizes', 'styles', 'colors']
        const idx = steps.indexOf(step)
        return Math.max(0, ((idx) / (steps.length - 1)) * 100)
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'white', zIndex: 1000, display: 'flex', flexDirection: 'column' }}
        >
            {/* Header */}
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {step !== STEPS.AUTH && step !== STEPS.DONE && step !== STEPS.WELCOME_BACK ? (
                    <button onClick={goBack} className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }}>
                        <ChevronLeft size={20} />
                    </button>
                ) : <div style={{ width: 28 }} />}

                {/* Progress Bar */}
                {step !== STEPS.AUTH && step !== STEPS.DONE && step !== STEPS.WELCOME_BACK && (
                    <div style={{ flex: 1, height: 4, background: 'hsl(var(--secondary))', borderRadius: 2, margin: '0 1rem' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${getProgress()}%` }}
                            style={{ height: '100%', background: 'hsl(var(--primary))', borderRadius: 2 }}
                        />
                    </div>
                )}

                <button onClick={onClose} className="btn btn-ghost btn-icon btn-sm">
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem 1.5rem', maxWidth: '400px', margin: '0 auto', width: '100%', overflowY: 'auto' }}>
                <AnimatePresence mode="wait">
                    {/* AUTH */}
                    {step === STEPS.AUTH && (
                        <motion.div key="auth" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                                    <Sparkles size={40} style={{ color: 'hsl(var(--primary))', marginBottom: '1rem' }} />
                                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
                                        {authMode === 'login' ? 'Welcome Back' : 'Join Wardrobe AI'}
                                    </h1>
                                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                                        Your personal AI stylist awaits ✨
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
                                    <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }} style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', fontWeight: 600, cursor: 'pointer' }}>
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
                                    <User size={32} style={{ color: 'hsl(var(--primary))', marginBottom: '0.75rem' }} />
                                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>What's your name?</h1>
                                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>So we can personalize your experience</p>
                                </div>
                                {error && <div style={{ background: 'hsl(0 84% 95%)', color: 'hsl(0 84% 40%)', padding: '0.75rem', borderRadius: 'var(--radius-lg)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Priya"
                                    value={userData.name}
                                    onChange={(e) => setUserData(prev => ({ ...prev, name: e.target.value }))}
                                    style={{ fontSize: '1.125rem', padding: '1rem' }}
                                />
                            </div>
                            <button className="btn btn-primary btn-lg w-full" onClick={goNext} disabled={!userData.name.trim()}>
                                Continue <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}

                    {/* GENDER */}
                    {step === STEPS.GENDER && (
                        <motion.div key="gender" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>How do you like to dress?</h1>
                                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>This helps us show relevant styles</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {['Women', 'Men', 'Unisex'].map(g => (
                                        <button
                                            key={g}
                                            onClick={() => { setUserData(prev => ({ ...prev, gender: g })); goNext() }}
                                            style={{
                                                padding: '1.25rem',
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                background: userData.gender === g ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                                                color: userData.gender === g ? 'white' : 'hsl(var(--foreground))',
                                                border: 'none',
                                                borderRadius: 'var(--radius-lg)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* LOCATION */}
                    {step === STEPS.LOCATION && (
                        <motion.div key="location" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <MapPin size={32} style={{ color: 'hsl(var(--primary))', marginBottom: '0.75rem' }} />
                                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Where are you based?</h1>
                                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>For weather-appropriate outfit suggestions</p>
                                </div>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Mumbai, Delhi, Bangalore"
                                    value={userData.location}
                                    onChange={(e) => setUserData(prev => ({ ...prev, location: e.target.value }))}
                                    style={{ fontSize: '1.125rem', padding: '1rem' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn btn-ghost" onClick={goNext} style={{ flex: 1 }}>Skip</button>
                                <button className="btn btn-primary btn-lg" onClick={goNext} style={{ flex: 2 }} disabled={!userData.location.trim()}>
                                    Continue <ArrowRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* SIZES */}
                    {step === STEPS.SIZES && (
                        <motion.div key="sizes" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <Shirt size={32} style={{ color: 'hsl(var(--primary))', marginBottom: '0.75rem' }} />
                                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>What's your size?</h1>
                                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>Helps with shopping recommendations</p>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label className="label" style={{ marginBottom: '0.5rem' }}>Top Size</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {TOP_SIZES.map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setUserData(prev => ({ ...prev, topSize: size }))}
                                                style={{
                                                    padding: '0.75rem 1.25rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    background: userData.topSize === size ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                                                    color: userData.topSize === size ? 'white' : 'hsl(var(--foreground))',
                                                    border: 'none',
                                                    borderRadius: 'var(--radius-md)',
                                                    cursor: 'pointer',
                                                    minWidth: '48px'
                                                }}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="label" style={{ marginBottom: '0.5rem' }}>Bottom Size (Waist)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {BOTTOM_SIZES.map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setUserData(prev => ({ ...prev, bottomSize: size }))}
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600,
                                                    background: userData.bottomSize === size ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                                                    color: userData.bottomSize === size ? 'white' : 'hsl(var(--foreground))',
                                                    border: 'none',
                                                    borderRadius: 'var(--radius-md)',
                                                    cursor: 'pointer',
                                                    minWidth: '48px'
                                                }}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <button className="btn btn-primary btn-lg w-full" onClick={goNext}>
                                Continue <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}

                    {/* STYLES */}
                    {step === STEPS.STYLES && (
                        <motion.div key="styles" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Pick your style vibes</h1>
                                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                                        Select up to 3 • {userData.styles.length}/3 selected
                                    </p>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {STYLE_OPTIONS.map(style => (
                                        <button
                                            key={style}
                                            onClick={() => toggleStyle(style)}
                                            style={{
                                                padding: '0.625rem 1rem',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                background: userData.styles.includes(style) ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                                                color: userData.styles.includes(style) ? 'white' : 'hsl(var(--foreground))',
                                                border: 'none',
                                                borderRadius: 'var(--radius-full)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button className="btn btn-primary btn-lg w-full" onClick={goNext} disabled={userData.styles.length === 0}>
                                Continue <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}

                    {/* COLORS */}
                    {step === STEPS.COLORS && (
                        <motion.div key="colors" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <Palette size={32} style={{ color: 'hsl(var(--primary))', marginBottom: '0.75rem' }} />
                                    <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Favorite colors?</h1>
                                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                                        Optional • Select up to 3
                                    </p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                                    {COLOR_OPTIONS.map(color => (
                                        <button
                                            key={color.name}
                                            onClick={() => toggleColor(color.name)}
                                            style={{
                                                aspectRatio: '1',
                                                borderRadius: 'var(--radius-lg)',
                                                background: color.hex,
                                                border: userData.colors.includes(color.name) ? '3px solid hsl(var(--primary))' : color.name === 'White' ? '1px solid hsl(var(--border))' : 'none',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                transition: 'transform 0.2s',
                                                transform: userData.colors.includes(color.name) ? 'scale(1.05)' : 'scale(1)'
                                            }}
                                        >
                                            {userData.colors.includes(color.name) && (
                                                <div style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: ['White', 'Beige', 'Yellow'].includes(color.name) ? '#333' : 'white'
                                                }}>
                                                    ✓
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button className="btn btn-ghost" onClick={handleFinalSave} style={{ flex: 1 }} disabled={loading}>Skip</button>
                                <button className="btn btn-primary btn-lg" onClick={handleFinalSave} style={{ flex: 2 }} disabled={loading}>
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : <>Finish <ArrowRight size={18} /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* DONE */}
                    {step === STEPS.DONE && (
                        <motion.div key="done" variants={slideVariants} initial="enter" animate="center" exit="exit" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
                            <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>You're all set, {userData.name.split(' ')[0]}!</h1>
                            <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '2rem' }}>Let's build your digital wardrobe</p>
                            <button className="btn btn-primary btn-lg w-full" onClick={handleComplete}>
                                Add Your First Clothes <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
