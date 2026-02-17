import { useState, useEffect } from 'react'
import { User, PencilSimple, Heart, SignOut, SpinnerGap, TShirt } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPreferences, getSavedOutfits, getRecentOutfits } from '../utils/storage'
import OnboardingFlow from '../components/OnboardingFlow'
import PreferencesFlow from '../components/PreferencesFlow'
import PublicOutfitModal from '../components/PublicOutfitModal'

export default function Profile() {
    const navigate = useNavigate()
    const { user, userProfile, loading: authLoading, signOut, refreshProfile } = useAuth()
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [showPreferencesFlow, setShowPreferencesFlow] = useState(false)
    const [activeTab, setActiveTab] = useState('outfits')
    const [selectedOutfit, setSelectedOutfit] = useState(null)
    const [savedOutfits, setSavedOutfits] = useState([])
    const [recentOutfits, setRecentOutfits] = useState([])

    const [preferences, setPreferences] = useState({
        thriftPreference: 'both',
        sizes: [],
        preferredColors: [],
        budget: [500, 5000],
        fitType: [],
        preferredStyles: [],
        materials: [],
        bodyType: '',
        gender: ''
    })

    // Load preferences and other data once on mount
    useEffect(() => {
        loadPreferences()
        loadSavedOutfits()
        loadRecentOutfits()
    }, [])



    const loadSavedOutfits = async () => {
        try {
            const data = await getSavedOutfits()
            setSavedOutfits(data)
        } catch (error) {
            console.error('Error loading saved outfits:', error)
        }
    }

    const loadRecentOutfits = async () => {
        try {
            const data = await getRecentOutfits()
            setRecentOutfits(data)
        } catch (error) {
            console.error('Error loading recent outfits:', error)
        }
    }



    const loadPreferences = async () => {
        try {
            const prefs = await getPreferences()
            if (prefs) {
                setPreferences(prefs)
            }
        } catch (error) {
            console.error('Error loading preferences:', error)
        }
    }



    const handleSignOut = async () => {
        await signOut()
        navigate('/')
    }

    const handlePreferencesComplete = async () => {
        setShowPreferencesFlow(false)
        loadPreferences()
        await refreshProfile() // refresh userProfile so name updates immediately
    }



    const displayName = userProfile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    const avatarUrl = userProfile?.selfie_url || userProfile?.avatar_url || user?.user_metadata?.avatar_url
    const initial = displayName?.[0]?.toUpperCase() || 'U'

    if (authLoading) {
        return (
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <SpinnerGap size={32} className="animate-spin" style={{ color: 'hsl(var(--accent))' }} />
            </div>
        )
    }

    // Not logged in state
    if (!user) {
        return (
            <div className="container">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Profile</h1>
                    <p className="text-muted text-sm">Sign in to save preferences</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'hsl(var(--card))',
                        borderRadius: 'var(--radius-xl)',
                        padding: '2rem',
                        textAlign: 'center',
                        border: '1px solid hsl(var(--border))'
                    }}
                >
                    <User size={48} style={{ color: 'hsl(var(--muted-foreground))', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Not signed in</h2>
                    <p className="text-muted text-sm" style={{ marginBottom: '1.25rem' }}>
                        Sign in to save your style preferences and access your closet across devices
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowOnboarding(true)}
                    >
                        Sign In
                    </button>
                </motion.div>

                <AnimatePresence>
                    {showOnboarding && (
                        <OnboardingFlow
                            isOpen={showOnboarding}
                            onClose={() => setShowOnboarding(false)}
                            onComplete={() => setShowOnboarding(false)}
                        />
                    )}
                </AnimatePresence>
            </div>
        )
    }

    return (
        <div className="container">
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Profile</h1>
                <p className="text-muted text-sm">Manage your account & preferences</p>
            </div>

            {/* Profile + Preferences Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'hsl(var(--card))',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1.25rem',
                    marginBottom: '1rem',
                    border: '1px solid hsl(var(--border))'
                }}
            >
                {/* Avatar + Name + Email row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" style={{ width: '56px', height: '56px', borderRadius: '50%' }} />
                    ) : (
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'hsl(var(--accent))',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 600
                        }}>
                            {initial}
                        </div>
                    )}
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.125rem', margin: 0 }}>{displayName}</h2>
                        <p className="text-muted text-sm" style={{ margin: 0 }}>{user?.email}</p>
                    </div>
                    {/* Edit pencil → opens PreferencesFlow */}
                    <button
                        onClick={() => setShowPreferencesFlow(true)}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-md)',
                            background: 'hsl(var(--secondary))',
                            border: '1px solid hsl(var(--border))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'hsl(var(--muted-foreground))',
                            flexShrink: 0
                        }}
                        title="Edit Preferences"
                    >
                        <PencilSimple size={18} weight="bold" />
                    </button>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'hsl(var(--border))', marginBottom: '1rem' }} />

                {/* Preference tags */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {preferences.gender && (
                        <div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                <span className="chip" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '24px', cursor: 'default' }}>{preferences.gender}</span>
                                {preferences.bodyType && <span className="chip" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '24px', cursor: 'default' }}>{preferences.bodyType}</span>}
                            </div>
                        </div>
                    )}

                    {preferences.preferredStyles?.length > 0 && (
                        <div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Styles</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                {preferences.preferredStyles.map(s => (
                                    <span key={s} className="chip chip-outline active" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '24px', cursor: 'default' }}>{s}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {preferences.preferredColors?.length > 0 && (
                        <div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Colors</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                {preferences.preferredColors.map(c => (
                                    <span key={c} className="chip" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '24px', cursor: 'default' }}>{c}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {preferences.fitType?.length > 0 && (
                        <div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fit & Size</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                {preferences.fitType.map(f => (
                                    <span key={f} className="chip" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '24px', cursor: 'default' }}>{f}</span>
                                ))}
                                {preferences.sizes?.map(s => (
                                    <span key={s} className="chip" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '24px', cursor: 'default' }}>{s}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {preferences.budget && (
                        <div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Budget</span>
                            <div style={{ marginTop: '0.25rem' }}>
                                <span className="chip" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '24px', cursor: 'default' }}>
                                    ₹{(preferences.budget[0] || 500).toLocaleString()} — ₹{(preferences.budget[1] || 5000).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Appearance Details */}
                    {(preferences.skinColor || preferences.hairColor || preferences.age) && (
                        <div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Appearance</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                {preferences.skinColor && (
                                    <span className="chip" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '24px', cursor: 'default', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        🎨 Skin: {preferences.skinColor}
                                    </span>
                                )}
                                {preferences.hairColor && (
                                    <span className="chip" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '24px', cursor: 'default', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        💇 Hair: {preferences.hairColor}
                                    </span>
                                )}
                                {preferences.age && (
                                    <span className="chip" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '24px', cursor: 'default' }}>
                                        Age: {preferences.age}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Username / Bio */}
                    {preferences.username && (
                        <div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</span>
                            <div style={{ marginTop: '0.25rem' }}>
                                <span className="chip chip-outline active" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '24px', cursor: 'default' }}>@{preferences.username}</span>
                            </div>
                        </div>
                    )}

                    {/* Empty state */}
                    {!preferences.gender && !preferences.preferredStyles?.length && !preferences.preferredColors?.length && (
                        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                            <p className="text-muted text-sm" style={{ marginBottom: '0.75rem' }}>No preferences set yet</p>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowPreferencesFlow(true)}>
                                Set Up Preferences ✨
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Preferences Flow Modal */}
            <AnimatePresence>
                {showPreferencesFlow && (
                    <PreferencesFlow
                        isOpen={showPreferencesFlow}
                        onClose={() => setShowPreferencesFlow(false)}
                        onComplete={handlePreferencesComplete}
                        existingPreferences={preferences}
                        existingProfile={userProfile}
                        mode="edit"
                    />
                )}
            </AnimatePresence>


            {/* Content Tabs - Saved and Recent Outfits */}
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                <button
                    className={`chip ${activeTab === 'outfits' ? 'active' : ''}`}
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setActiveTab('outfits')}
                >
                    <Heart size={14} className="fill-current" />
                    Saved Outfits ({savedOutfits.length})
                </button>
                <button
                    className={`chip ${activeTab === 'recent' ? 'active' : ''}`}
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setActiveTab('recent')}
                >
                    Recent ({recentOutfits.length})
                </button>
            </div>

            {/* Saved Outfits Grid */}
            {activeTab === 'outfits' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr)', // Force single column 
                        gap: '1rem',
                        marginBottom: '1.5rem'
                    }}
                >
                    {savedOutfits.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem 1rem', background: 'hsl(var(--muted))', borderRadius: 'var(--radius-lg)' }}>
                            <p className="text-muted text-sm">No saved outfits yet</p>
                        </div>
                    ) : (
                        savedOutfits.map(outfit => (
                            <div
                                key={outfit.id}
                                className="card"
                                style={{ padding: '0.75rem', overflow: 'hidden', cursor: 'pointer' }}
                                onClick={() => setSelectedOutfit(outfit)}
                            >
                                {/* Horizontal Items Strip with Fade & CTA - No Header */}
                                <div style={{ position: 'relative', height: '120px' }}>
                                    <div style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        overflowX: 'auto',
                                        height: '100%',
                                        scrollbarWidth: 'none', // Hide scrollbar
                                        paddingRight: '140px' // Increased space for fade/button
                                    }}>
                                        {outfit.items.map((item, i) => (
                                            <div key={i} style={{
                                                position: 'relative',
                                                height: '100%',
                                                aspectRatio: '1/1',
                                                borderRadius: 'var(--radius-lg)',
                                                overflow: 'hidden',
                                                border: '1px solid hsl(var(--border))',
                                                flexShrink: 0
                                            }}>
                                                <img
                                                    src={item.image}
                                                    alt=""
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Fade Overlay & CTA */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        bottom: 0,
                                        width: '240px', // Wider fade
                                        background: 'linear-gradient(to right, transparent, hsl(var(--card)) 40%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        paddingLeft: '2rem'
                                    }}>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            style={{ whiteSpace: 'nowrap' }}
                                            onClick={() => navigate('/outfit', { state: { mood: outfit.mood } })}
                                        >
                                            Try '{outfit.mood}' Outfit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </motion.div>
            )}

            {/* Recent Outfits Grid */}
            {activeTab === 'recent' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr)', // Force single column
                        gap: '1rem',
                        marginBottom: '1.5rem'
                    }}
                >
                    {recentOutfits.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem 1rem', background: 'hsl(var(--muted))', borderRadius: 'var(--radius-lg)' }}>
                            <p className="text-muted text-sm">No recent outfits yet</p>
                        </div>
                    ) : (
                        recentOutfits.map(outfit => (
                            <div
                                key={outfit.id}
                                className="card"
                                style={{ padding: '0.75rem', overflow: 'hidden', cursor: 'pointer' }}
                                onClick={() => setSelectedOutfit(outfit)}
                            >
                                {/* Horizontal Items Strip with Fade & CTA - No Header */}
                                <div style={{ position: 'relative', height: '120px' }}>
                                    <div style={{
                                        display: 'flex',
                                        gap: '0.5rem',
                                        overflowX: 'auto',
                                        height: '100%',
                                        scrollbarWidth: 'none', // Hide scrollbar
                                        paddingRight: '140px' // Increased space for fade/button
                                    }}>
                                        {outfit.items.map((item, i) => (
                                            <div key={i} style={{
                                                position: 'relative',
                                                height: '100%',
                                                aspectRatio: '1/1',
                                                borderRadius: 'var(--radius-lg)',
                                                overflow: 'hidden',
                                                border: '1px solid hsl(var(--border))',
                                                flexShrink: 0
                                            }}>
                                                <img
                                                    src={item.image}
                                                    alt=""
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Fade Overlay & CTA */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        bottom: 0,
                                        width: '240px', // Wider fade
                                        background: 'linear-gradient(to right, transparent, hsl(var(--card)) 40%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        paddingLeft: '2rem'
                                    }}>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            style={{ whiteSpace: 'nowrap' }}
                                            onClick={() => navigate('/outfit', { state: { mood: outfit.mood } })}
                                        >
                                            Try '{outfit.mood}' Outfit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </motion.div>
            )}



            {/* Sign Out */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="btn btn-outline w-full"
                onClick={handleSignOut}
                style={{ color: 'hsl(var(--destructive))' }}
            >
                <SignOut size={16} />
                Sign Out
            </motion.button>

            {/* Public Outfit Detail Modal */}
            <AnimatePresence>
                {selectedOutfit && (
                    <PublicOutfitModal
                        isOpen={!!selectedOutfit}
                        onClose={() => setSelectedOutfit(null)}
                        outfit={selectedOutfit}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

