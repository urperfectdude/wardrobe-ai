import { useState, useEffect } from 'react'
import { User, PencilSimple, At, Heart, SignOut, Check, SpinnerGap, Gear, CaretRight, Palette, TShirt, ShoppingBag } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getPreferences, savePreferences, getPurchaseRequests, updatePurchaseRequest, getSavedOutfits, getRecentOutfits } from '../utils/storage'
import { EXISTING_CATEGORY4, EXISTING_COLORS } from '../utils/openaiAnalysis'
import OnboardingFlow from '../components/OnboardingFlow'
import PublicOutfitModal from '../components/PublicOutfitModal'
import DualRangeSlider from '../components/DualRangeSlider'

const BODY_TYPES = ['Slim', 'Athletic', 'Regular', 'Curvy', 'Plus Size']

export default function Profile() {
    const navigate = useNavigate()
    const { user, userProfile, loading: authLoading, signOut, refreshProfile } = useAuth()
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [saving, setSaving] = useState(false)
    const [requests, setRequests] = useState([])
    const [savedOutfits, setSavedOutfits] = useState([])
    const [recentOutfits, setRecentOutfits] = useState([])
    const [loadingRequests, setLoadingRequests] = useState(true)
    const [activeTab, setActiveTab] = useState('outfits') // 'outfits' or 'selling' or 'buying'
    const [isPrefsOpen, setIsPrefsOpen] = useState(false)
    const [selectedOutfit, setSelectedOutfit] = useState(null)

    const [profile, setProfile] = useState({
        name: '',
        username: ''
    })

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
        loadRequests()
        loadSavedOutfits()
        loadRecentOutfits()
    }, [])

    // Update profile state when userProfile changes (but don't reload preferences)
    useEffect(() => {
        if (userProfile) {
            setProfile({
                name: userProfile.name || '',
                username: userProfile.username || ''
            })
        }
    }, [userProfile])

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

    const loadRequests = async () => {
        setLoadingRequests(true)
        try {
            const data = await getPurchaseRequests()
            setRequests(data)
        } catch (error) {
            console.error('Error loading requests:', error)
        } finally {
            setLoadingRequests(false)
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

    const handleSaveProfile = async () => {
        setSaving(true)
        try {
            await supabase.from('user_profiles').upsert({
                user_id: user.id,
                name: profile.name,
                username: profile.username
            })
            await savePreferences(preferences)
            await refreshProfile()
            setEditMode(false)
        } catch (error) {
            console.error('Error saving profile:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleSignOut = async () => {
        await signOut()
        navigate('/')
    }

    const togglePreference = (type, value) => {
        setPreferences(prev => {
            const current = prev[type] || []
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value]
            return { ...prev, [type]: updated }
        })
    }

    const handleUpdateRequestStatus = async (requestId, status) => {
        const qilinLink = status === 'accepted' ? 'https://qilin.in/sell' : null
        try {
            await updatePurchaseRequest(requestId, status, qilinLink)
            loadRequests()
        } catch (error) {
            console.error('Failed to update request:', error)
        }
    }

    const displayName = userProfile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    const avatarUrl = userProfile?.avatar_url || user?.user_metadata?.avatar_url
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

            {/* Profile Card */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                        {editMode ? (
                            <input
                                type="text"
                                className="input"
                                value={profile.name}
                                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Your name"
                                style={{ marginBottom: '0.5rem' }}
                            />
                        ) : (
                            <h2 style={{ fontSize: '1.125rem', margin: 0 }}>{displayName}</h2>
                        )}
                        {editMode ? (
                            <div style={{ position: 'relative' }}>
                                <At size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                                <input
                                    type="text"
                                    className="input"
                                    value={profile.username}
                                    onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                                    placeholder="username"
                                    style={{ paddingLeft: '2rem' }}
                                />
                            </div>
                        ) : (
                            <p className="text-muted text-sm" style={{ margin: 0 }}>
                                {userProfile?.username ? `@${userProfile.username}` : user?.email}
                            </p>
                        )}
                    </div>
                    {/* Pencil Edit Icon */}
                    {!editMode && (
                        <button
                            onClick={() => {
                                // Autofill with existing data when entering edit mode
                                setProfile({
                                    name: userProfile?.name || user?.user_metadata?.full_name || '',
                                    username: userProfile?.username || ''
                                })
                                setEditMode(true)
                            }}
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
                        >
                            <PencilSimple size={18} weight="bold" />
                        </button>
                    )}
                </div>

                {editMode && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditMode(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveProfile} disabled={saving}>
                            {saving ? <SpinnerGap size={16} className="animate-spin" /> : <Check size={16} />}
                            Save
                        </button>
                    </div>
                )}
            </motion.div>

            {/* Personal Info & Style Specs */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                    background: 'hsl(var(--card))',
                    borderRadius: 'var(--radius-xl)',
                    padding: '1.25rem',
                    marginBottom: '1rem',
                    border: '1px solid hsl(var(--border))'
                }}
            >
                {/* Profile Detail Header */}
                <div style={{ marginBottom: '1rem', borderBottom: '1px solid hsl(var(--border))', paddingBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.375rem', margin: 0 }}>
                        <Gear size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                        Personal Styling Info
                    </h3>
                </div>

                {/* Personal Info Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div>
                        <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>Body Type</label>
                        <select
                            className="input"
                            value={preferences.bodyType}
                            onChange={(e) => setPreferences(prev => ({ ...prev, bodyType: e.target.value }))}
                            style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem', height: 'auto', minHeight: 'unset' }}
                        >
                            <option value="">Select...</option>
                            {BODY_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>Gender / Persona</label>
                        <select
                            className="input"
                            value={preferences.gender}
                            onChange={(e) => setPreferences(prev => ({ ...prev, gender: e.target.value }))}
                            style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem', height: 'auto', minHeight: 'unset' }}
                        >
                            <option value="">Select...</option>
                            <option value="Men">Men</option>
                            <option value="Women">Women</option>
                            <option value="Unisex">Unisex</option>
                        </select>
                    </div>
                </div>

                {/* Collapsible Style Specs */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        padding: '0.75rem',
                        background: 'hsl(var(--secondary))',
                        borderRadius: 'var(--radius-md)',
                        transition: 'background 0.2s'
                    }}
                    onClick={() => setIsPrefsOpen(!isPrefsOpen)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Heart size={16} className={isPrefsOpen ? 'fill-current' : ''} style={{ color: 'hsl(var(--accent))' }} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Detailed Style Specs</span>
                    </div>
                    <CaretRight size={18} style={{ transform: isPrefsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                <AnimatePresence>
                    {isPrefsOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                                {/* Thrift Preference */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>Shopping Preference</label>
                                    <div style={{ display: 'flex', background: 'hsl(var(--secondary))', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
                                        {['new', 'both', 'thrifted'].map(opt => (
                                            <button
                                                key={opt}
                                                className={`btn btn-sm ${preferences.thriftPreference === opt ? 'btn-white shadow-sm' : 'btn-ghost'}`}
                                                onClick={() => setPreferences(prev => ({ ...prev, thriftPreference: opt }))}
                                                style={{
                                                    flex: 1,
                                                    textTransform: 'capitalize',
                                                    padding: '2px 8px',
                                                    fontSize: '0.6875rem',
                                                    height: '28px',
                                                    minHeight: 'unset',
                                                    color: preferences.thriftPreference === opt ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'
                                                }}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Preferred Styles */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>Preferred Styles</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxHeight: '100px', overflowY: 'auto' }}>
                                        {EXISTING_CATEGORY4.slice(0, 20).map(style => (
                                            <button
                                                key={style}
                                                type="button"
                                                className={`chip chip-outline ${preferences.preferredStyles?.includes(style) ? 'active' : ''}`}
                                                onClick={() => togglePreference('preferredStyles', style)}
                                                style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem', minHeight: '26px' }}
                                            >
                                                {style}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Fit Type */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>Fit Type</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {['Slim', 'Regular', 'Relaxed', 'Oversized', 'Loose', 'Athletic'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                className={`chip chip-outline ${preferences.fitType?.includes(type) ? 'active' : ''}`}
                                                onClick={() => togglePreference('fitType', type)}
                                                style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem', minHeight: '26px' }}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Sizes */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>Sizes</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map(size => (
                                            <button
                                                key={size}
                                                type="button"
                                                className={`chip chip-outline ${preferences.sizes?.includes(size) ? 'active' : ''}`}
                                                onClick={() => togglePreference('sizes', size)}
                                                style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem', minHeight: '26px', minWidth: '32px', justifyContent: 'center' }}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Preferred Colors */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>Preferred Colors</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {EXISTING_COLORS.slice(0, 15).map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                className={`chip chip-outline ${preferences.preferredColors?.includes(color) ? 'active' : ''}`}
                                                onClick={() => togglePreference('preferredColors', color)}
                                                style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem', minHeight: '26px' }}
                                            >
                                                {color}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Materials */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>Preferred Materials</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {['Cotton', 'Polyester', 'Silk', 'Denim', 'Wool', 'Linen', 'Leather', 'Velvet', 'Satin', 'Rayon', 'Nylon'].map(mat => (
                                            <button
                                                key={mat}
                                                type="button"
                                                className={`chip chip-outline ${preferences.materials?.includes(mat) ? 'active' : ''}`}
                                                onClick={() => togglePreference('materials', mat)}
                                                style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem', minHeight: '26px' }}
                                            >
                                                {mat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Budget Slider */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>Budget Range (₹)</label>
                                    <DualRangeSlider
                                        min={0}
                                        max={20000}
                                        step={500}
                                        value={Array.isArray(preferences.budget) ? preferences.budget : [500, 5000]}
                                        onChange={(newBudget) => setPreferences(prev => ({
                                            ...prev,
                                            budget: newBudget
                                        }))}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    className="btn btn-primary w-full"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    style={{ marginTop: '1.5rem' }}
                >
                    {saving ? <SpinnerGap size={16} className="animate-spin" /> : <Check size={16} />}
                    Save All Preferences
                </button>
            </motion.div>


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

            {/* Purchase Requests Section */}
            {(activeTab === 'selling' || activeTab === 'buying') && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        background: 'hsl(var(--card))',
                        borderRadius: 'var(--radius-xl)',
                        padding: '1.25rem',
                        marginBottom: '1rem',
                        border: '1px solid hsl(var(--border))'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.9375rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <ShoppingBag size={16} style={{ color: 'hsl(var(--accent))' }} />
                            Marketplace Offers
                        </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {loadingRequests ? (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>
                                <SpinnerGap size={24} className="animate-spin" style={{ color: 'hsl(var(--muted-foreground))' }} />
                            </div>
                        ) : (
                            requests.filter(r => activeTab === 'selling' ? r.seller_id === user.id : r.buyer_id === user.id).length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: '0.75rem', padding: '1.5rem 0' }}>
                                    No {activeTab} offers yet
                                </p>
                            ) : (
                                requests.filter(r => activeTab === 'selling' ? r.seller_id === user.id : r.buyer_id === user.id).map(request => (
                                    <div key={request.id} style={{
                                        padding: '0.75rem',
                                        background: 'white',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '1px solid hsl(var(--border))'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>₹{request.offer_price}</div>
                                                <span style={{
                                                    fontSize: '0.5rem', fontWeight: 700, padding: '2px 4px', borderRadius: '4px',
                                                    background: request.status === 'pending' ? 'hsl(var(--secondary))' :
                                                        request.status === 'accepted' ? 'hsl(var(--green-100))' : 'hsl(var(--destructive) / 0.1)',
                                                    color: request.status === 'accepted' ? 'hsl(var(--green-600))' :
                                                        request.status === 'declined' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {request.status}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.625rem', color: 'hsl(var(--muted-foreground))' }}>
                                                {new Date(request.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        {request.message && (
                                            <p style={{ fontSize: '0.75rem', margin: '0 0 0.75rem', color: 'hsl(var(--foreground))', fontStyle: 'italic' }}>
                                                "{request.message}"
                                            </p>
                                        )}

                                        {activeTab === 'selling' && request.status === 'pending' && (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    style={{ flex: 1, fontSize: '0.6875rem', minHeight: '32px' }}
                                                    onClick={() => handleUpdateRequestStatus(request.id, 'accepted')}
                                                >
                                                    Accept & Sell
                                                </button>
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    style={{ flex: 1, fontSize: '0.6875rem', minHeight: '32px' }}
                                                    onClick={() => handleUpdateRequestStatus(request.id, 'declined')}
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        )}

                                        {activeTab === 'buying' && request.status === 'accepted' && (
                                            <a
                                                href={request.qilin_link || 'https://qilin.in'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-primary btn-sm w-full"
                                                style={{ fontSize: '0.6875rem', minHeight: '32px' }}
                                            >
                                                Complete Purchase on Qilin.in
                                            </a>
                                        )}
                                    </div>
                                ))
                            )
                        )}
                    </div>
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

