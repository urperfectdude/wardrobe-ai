import { useState, useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MagicWand, Shuffle, Sparkle, ArrowRight, X, Heart, Check, ArrowSquareOut, SpinnerGap, TShirt, Gear, PencilSimple, CaretDown, CaretUp, ClockCounterClockwise, BookmarkSimple } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { getWardrobeItems, savePreferences, getPreferences, saveOutfit, markOutfitAsSaved, getRecentOutfits, getSavedOutfits, saveRecentOutfit, saveRecentToSaved } from '../utils/storage'
import { generateOutfit, OCCASION_CATEGORIES, scoreProductMatch } from '../utils/outfitMatcher'
import { EXISTING_CATEGORY4, EXISTING_COLORS, generateOutfitDescription } from '../utils/openaiAnalysis'
import { analyzeGaps } from '../utils/gapAnalysis'
import { useAuth } from '../contexts/AuthContext'
import OnboardingFlow from '../components/OnboardingFlow'
import PreferencesFlow from '../components/PreferencesFlow'
import ParameterSelector from '../components/ParameterSelector'

import { supabase } from '../lib/supabase'

const MOODS = [
    { id: 'party', label: 'Party' },
    { id: 'office', label: 'Office' },
    { id: 'casual', label: 'Casual' },
    { id: 'date', label: 'Date Night' },
    { id: 'wedding', label: 'Wedding' },
    { id: 'vacation', label: 'Vacation' },
    { id: 'gym', label: 'Gym' },
    { id: 'brunch', label: 'Brunch' },
    { id: 'cozy', label: 'Cozy Night In' },
    { id: 'interview', label: 'Interview' }
]

const BODY_TYPES = ['Slim', 'Athletic', 'Regular', 'Curvy', 'Plus Size']

// Helper Components
const OutfitList = ({ outfits, title, icon: Icon, emptyMsg, onOutfitClick }) => (
    <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon size={16} /> {title}
        </h3>
        {outfits.length === 0 ? (
            <p className="text-muted text-sm italic">{emptyMsg}</p>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {outfits.map((histOutfit) => (
                    <HistoryCard
                        key={histOutfit.id}
                        outfit={histOutfit}
                        onClick={() => onOutfitClick(histOutfit)}
                    />
                ))}
            </div>
        )}
    </div>
)

const HistoryCard = ({ outfit, onClick }) => {
    const [expanded, setExpanded] = useState(false)

    return (
        <div
            className="card"
            style={{ padding: '0.75rem', cursor: 'pointer' }}
            onClick={(e) => {
                if (e.target.closest('.expand-btn')) return
                onClick()
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'capitalize' }}>
                        {outfit.mood} Outfit
                    </span>
                    {outfit.is_saved && <BookmarkSimple size={12} weight="fill" style={{ fill: "currentColor", color: "hsl(var(--accent))" }} />}
                </div>

                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                    {new Date(outfit.created_at).toLocaleDateString()}
                </span>
            </div>

            {/* Preview Images */}
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                {Array.isArray(outfit.items) && outfit.items.slice(0, 4).map((item, idx) => (
                    <img
                        key={idx}
                        src={item.image}
                        alt="Item"
                        style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', flexShrink: 0 }}
                    />
                ))}
            </div>

            {/* Expandable Description */}
            {outfit.description && (
                <div style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                        className="expand-btn"
                        onClick={(e) => {
                            e.stopPropagation()
                            setExpanded(!expanded)
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'hsl(var(--accent))', background: 'none', border: 'none', padding: 0, fontWeight: 600 }}
                    >
                        <Sparkle size={10} />
                        {expanded ? "Hide AI Analysis" : "Show AI Analysis"}
                    </button>
                    {expanded && (
                        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.375rem', lineHeight: '1.4' }}>
                            {outfit.description}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

export default function GetOutfit() {
    const [searchParams] = useSearchParams()
    const moodFromUrl = searchParams.get('mood')
    const showPreferencesFromUrl = searchParams.get('preferences') === 'true'

    const [wardrobeItems, setWardrobeItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedMood, setSelectedMood] = useState(moodFromUrl || 'party')
    const [outfit, setOutfit] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [outfitDescription, setOutfitDescription] = useState('')
    const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
    const [activeOutfitId, setActiveOutfitId] = useState(null)
    const [showPreferences, setShowPreferences] = useState(showPreferencesFromUrl)

    // Source fixed to 'closet'
    const source = 'closet'

    // Tab for Saved/Recent toggle
    const [activeTab, setActiveTab] = useState('saved')

    // User preferences state
    const [preferences, setPreferences] = useState({
        thriftPreference: 'both',
        sizes: [],
        preferredColors: [],
        budget: [500, 5000],
        fitType: [],
        preferredStyles: [],
        materials: []
    })
    const [recentOutfits, setRecentOutfits] = useState([])
    const [savedOutfits, setSavedOutfits] = useState([])
    const [isPublic, setIsPublic] = useState(false)
    const [isSavingOutfit, setIsSavingOutfit] = useState(false)
    const [missingItems, setMissingItems] = useState([])



    const { user } = useAuth()

    // Load wardrobe items
    useEffect(() => {
        async function loadData() {
            try {
                const [items, savedPrefs, recent, saved] = await Promise.all([
                    getWardrobeItems().catch(() => []),
                    getPreferences().catch(() => null),
                    getRecentOutfits().catch(() => []),
                    getSavedOutfits().catch(() => [])
                ])
                setWardrobeItems(items)
                setRecentOutfits(recent)
                setSavedOutfits(saved)

                if (savedPrefs) {
                    setPreferences(savedPrefs)
                }
            } catch (error) {
                console.error('Error loading data:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // Handler for mood change - resets UI as requested
    const handleMoodChange = (moodId) => {
        setSelectedMood(moodId)
        setOutfit(null) // Reset current view
        setOutfitDescription('')
        setActiveOutfitId(null)
    }

    const refreshLists = async () => {
        const [recent, saved] = await Promise.all([
            getRecentOutfits(),
            getSavedOutfits()
        ])
        setRecentOutfits(recent)
        setSavedOutfits(saved)
    }

    // Auto-generate outfit when mood is passed via URL
    useEffect(() => {
        if (moodFromUrl && !loading && wardrobeItems.length >= 1) {
            setSelectedMood(moodFromUrl)
            setTimeout(() => {
                generateOutfitWithProducts(moodFromUrl)
            }, 300)
        }
    }, [moodFromUrl, loading, wardrobeItems.length])

    const generateOutfitWithProducts = useCallback((mood) => {
        setIsGenerating(true)
        setOutfit(null) // Clear previous while generating

        setTimeout(async () => {
            let outfitItems = []

            // Get items from closet
            const closetSuggestions = generateOutfit(wardrobeItems, mood, 1)
            if (closetSuggestions[0]) {
                outfitItems = closetSuggestions[0].items.map(item => ({
                    ...item,
                    source: 'closet'
                }))
            }

            if (outfitItems.length > 0) {
                const newOutfit = {
                    mood: mood,
                    items: outfitItems.map(item => ({ ...item, liked: false }))
                }
                setOutfit(newOutfit)

                // Get AI Description (Try first, but don't block)
                let desc = ''
                try {
                    desc = await generateOutfitDescription(mood, outfitItems)
                    setOutfitDescription(desc)
                    setIsDescriptionOpen(true)
                } catch (err) {
                    console.error("Error generating description:", err)
                }

                // Auto-save to recent_outfits (source of truth for generation history)
                try {
                    const outfitToSave = { ...newOutfit, description: desc, reason: desc }
                    const saved = await saveRecentOutfit(outfitToSave, preferences)
                    if (saved) {
                        setActiveOutfitId(saved.id)
                        await refreshLists()
                    }
                } catch (err) {
                    console.error("Error auto-saving to recent_outfits:", err)
                }
                // Run AI Gap Analysis in background
                try {
                    const gaps = await analyzeGaps(wardrobeItems, outfitItems, mood)
                    setMissingItems(gaps)

                    // Save missing items to the outfit record
                    if (saved && gaps.length > 0) {
                        await supabase
                            .from('recent_outfits')
                            .update({ missing_items: gaps })
                            .eq('id', saved.id)
                    }
                } catch (err) {
                    console.error('Gap analysis error:', err)
                }

            } else {
                setOutfit(null)
                setOutfitDescription('')
                setMissingItems([])
            }

            setIsGenerating(false)
        }, 800)
    }, [wardrobeItems, preferences])


    const [showOnboarding, setShowOnboarding] = useState(false)

    const handleGenerateOutfit = useCallback(() => {
        if (!selectedMood) return

        if (!user) {
            setShowOnboarding(true)
            return
        }

        if ((source === 'closet' || source === 'both') && wardrobeItems.length < 2) {
            alert("Please upload at least 2 items to your closet to generate outfits!")
            return
        }

        generateOutfitWithProducts(selectedMood)
    }, [selectedMood, user, source, wardrobeItems.length, generateOutfitWithProducts])

    const handleShuffle = useCallback(() => {
        handleGenerateOutfit()
    }, [handleGenerateOutfit])

    const handleToggleLike = (itemIdx) => {
        setOutfit(prev => {
            if (!prev) return prev
            const newItems = [...prev.items]
            newItems[itemIdx] = { ...newItems[itemIdx], liked: !newItems[itemIdx].liked }
            return { ...prev, items: newItems }
        })
    }

    const handleSaveOutfit = async () => {
        if (!activeOutfitId) return // Need recent outfit ID to save
        setIsSavingOutfit(true)
        try {
            // Save from recent_outfits to saved_outfits
            await saveRecentToSaved(activeOutfitId, isPublic)
            await refreshLists()
            // Reset page after save
            setOutfit(null)
            setActiveOutfitId(null)
            setOutfitDescription('')
            setIsPublic(false) // Reset public toggle
        } catch (error) {
            console.error('Failed to save outfit:', error)
        } finally {
            setIsSavingOutfit(false)
        }
    }


    const handlePreferencesComplete = async () => {
        setShowPreferences(false)
        try {
            const savedPrefs = await getPreferences()
            if (savedPrefs) setPreferences(savedPrefs)
        } catch (e) {
            console.error('Failed to reload preferences:', e)
        }
    }

    const handleOutfitClick = (histOutfit) => {
        setOutfit({ mood: histOutfit.mood, items: histOutfit.items })
        setOutfitDescription(histOutfit.description || '')
        setActiveOutfitId(histOutfit.id)
        setIsDescriptionOpen(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const hasItems = wardrobeItems.length >= 1



    if (loading) {
        return (
            <div className="container">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Get Your Outfit</h1>
                    <p className="text-muted text-sm">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Get Your Outfit</h1>
                    <p className="text-muted text-sm">AI styles you from your wardrobe</p>
                </div>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                        if (!user) {
                            setShowOnboarding(true)
                            return
                        }
                        setShowPreferences(true)
                    }}
                    style={{ gap: '0.25rem', fontSize: '0.75rem' }}
                >
                    <Gear size={16} />
                    Preferences
                </button>
            </div>





            {/* Warning if not enough items */}
            {wardrobeItems.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'hsl(var(--green-100))',
                        border: '1px solid hsl(var(--accent) / 0.3)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '1.25rem',
                        textAlign: 'center',
                        marginBottom: '1rem'
                    }}
                >
                    <Sparkle size={28} style={{ color: 'hsl(var(--accent))', marginBottom: '0.75rem' }} />
                    <h3 style={{ marginBottom: '0.375rem', fontSize: '1rem' }}>No Items in Closet</h3>
                    <p className="text-muted text-sm" style={{ marginBottom: '0.75rem' }}>
                        Add items to your closet to get started
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Link to="/closet" className="btn btn-primary btn-sm">
                            Add Clothes
                        </Link>
                    </div>
                </motion.div>
            )}

            {/* Mood/Occasion Input - ChatGPT Style */}
            <section style={{ marginBottom: '1rem' }}>
                <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                    <input
                        type="text"
                        value={MOODS.find(m => m.id === selectedMood)?.label || selectedMood || ''}
                        onChange={(e) => {
                            const val = e.target.value.toLowerCase().trim()
                            const foundMood = MOODS.find(m => m.label.toLowerCase() === val || m.id === val)
                            if (foundMood) {
                                handleMoodChange(foundMood.id)
                            } else {
                                setSelectedMood(val)
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && selectedMood) {
                                handleGenerateOutfit()
                            }
                        }}
                        placeholder="What's the occasion? (e.g., Party, Office, Date Night)"
                        style={{
                            width: '100%',
                            padding: '0.875rem 3rem 0.875rem 1rem',
                            fontSize: '0.9375rem',
                            border: '2px solid hsl(var(--border))',
                            borderRadius: 'var(--radius-xl)',
                            background: 'hsl(var(--card))',
                            color: 'hsl(var(--foreground))',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s'
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = 'hsl(var(--primary))'
                            e.target.style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.1)'
                        }}
                        onBlur={(e) => {
                            e.target.style.borderColor = 'hsl(var(--border))'
                            e.target.style.boxShadow = 'none'
                        }}
                    />
                    <button
                        onClick={() => selectedMood && handleGenerateOutfit()}
                        disabled={!selectedMood || isGenerating}
                        style={{
                            position: 'absolute',
                            right: '0.5rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-lg)',
                            background: selectedMood ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                            color: selectedMood ? 'white' : 'hsl(var(--muted-foreground))',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: selectedMood ? 'pointer' : 'not-allowed',
                            transition: 'background 0.2s'
                        }}
                    >
                        {isGenerating ? <SpinnerGap size={18} className="animate-spin" /> : <MagicWand size={18} weight="fill" />}
                    </button>
                </div>

                {/* Occasion Chips */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    justifyContent: 'center'
                }}>
                    {MOODS.map((mood, idx) => (
                        <motion.button
                            key={mood.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: idx * 0.03 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleMoodChange(mood.id)}
                            style={{
                                padding: '0.5rem 0.875rem',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                background: 'hsl(var(--muted))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius-full)',
                                color: 'hsl(var(--foreground))',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'hsl(var(--primary) / 0.1)'
                                e.target.style.borderColor = 'hsl(var(--primary) / 0.3)'
                                e.target.style.color = 'hsl(var(--primary))'
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'hsl(var(--muted))'
                                e.target.style.borderColor = 'hsl(var(--border))'
                                e.target.style.color = 'hsl(var(--foreground))'
                            }}
                        >
                            {mood.label}
                        </motion.button>
                    ))}
                </div>
            </section>



            {/* Outfit Display */}
            <AnimatePresence mode="wait">
                {outfit && (
                    <motion.div
                        key={outfit.items.map(i => i.id).join('-')}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{ marginBottom: '1.5rem' }}
                    >
                        <div style={{
                            background: 'hsl(var(--card))',
                            borderRadius: 'var(--radius-xl)',
                            padding: '1rem',
                            border: '1px solid hsl(var(--border))'
                        }}>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                marginBottom: '1rem',
                                background: 'hsl(var(--secondary) / 0.5)',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-lg)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                        <Sparkle size={14} style={{ color: 'hsl(var(--accent))' }} />
                                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                            {MOODS.find(o => o.id === outfit.mood)?.label || outfit.mood} Look
                                        </span>
                                    </div>
                                    <button className="btn btn-ghost btn-sm" onClick={handleShuffle} style={{ height: '32px' }}>
                                        <Shuffle size={14} /> <span style={{ fontSize: '0.75rem' }}>Shuffle</span>
                                    </button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid hsl(var(--border))' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label className="toggle" style={{ margin: 0, minHeight: 'auto' }}>
                                            <input
                                                type="checkbox"
                                                checked={isPublic}
                                                onChange={(e) => setIsPublic(e.target.checked)}
                                            />
                                            <div className="toggle-track" style={{ width: '32px', height: '18px' }}>
                                                <div className="toggle-thumb" style={{ width: '14px', height: '14px', transform: isPublic ? 'translateX(14px)' : 'none' }}></div>
                                            </div>
                                        </label>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Make Public</span>
                                    </div>

                                    {/* Save button - requires activeOutfitId from recent_outfits */}
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={handleSaveOutfit}
                                        disabled={isSavingOutfit || !activeOutfitId}
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        {isSavingOutfit ? <SpinnerGap size={13} className="animate-spin" /> : <BookmarkSimple size={13} />}
                                        Save Outfit
                                    </button>
                                </div>
                            </div>
                            <div style={{
                                width: '100%',
                                overflowX: 'auto',
                                paddingBottom: '0.5rem',
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none'
                            }}>
                                <div style={{ display: 'flex', gap: '0.75rem', paddingRight: '1rem' }}>
                                    {outfit.items.map((item, idx) => (
                                        <motion.div
                                            key={item.id || idx}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.1 }}
                                            style={{
                                                minWidth: '160px',
                                                width: '180px',
                                                background: 'white',
                                                borderRadius: 'var(--radius-lg)',
                                                overflow: 'hidden',
                                                border: '1px solid hsl(var(--border))',
                                                flexShrink: 0
                                            }}
                                        >
                                            <div
                                                onClick={(e) => {
                                                    // e.preventDefault() // No longer needed as we're not using anchor tags for shop items
                                                }}
                                                style={{ display: 'block', position: 'relative', aspectRatio: '3/4', cursor: 'default' }}
                                            >
                                                <img
                                                    src={item.image}
                                                    alt={item.title || item.name || 'Item'}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                                {/* Badge */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '0.5rem',
                                                    left: '0.5rem',
                                                    padding: '0.25rem 0.5rem',
                                                    background: 'hsl(142 71% 45%)',
                                                    color: 'white',
                                                    fontSize: '0.5625rem',
                                                    fontWeight: 700,
                                                    borderRadius: 'var(--radius-sm)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.125rem'
                                                }}>
                                                    <TShirt size={10} />
                                                    My Closet
                                                </div>

                                                {/* Like Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleToggleLike(idx);
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '0.5rem',
                                                        right: '0.5rem',
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        background: item.liked ? 'hsl(var(--accent))' : 'rgba(255,255,255,0.8)',
                                                        color: item.liked ? 'white' : 'hsl(var(--muted-foreground))',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        boxShadow: 'var(--shadow-sm)',
                                                        zIndex: 2
                                                    }}
                                                >
                                                    <Check size={14} strokeWidth={3} />
                                                </button>
                                            </div>

                                            {/* Info Section */}
                                            <div style={{ padding: '0.625rem' }}>
                                                <p style={{
                                                    fontSize: '0.6875rem',
                                                    fontWeight: 600,
                                                    margin: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    {item.title || item.name}
                                                </p>

                                                {/* Price or Category */}
                                                {(item.category3 || item.category4) && (
                                                    <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                                        {item.category3 && (
                                                            <span style={{ fontSize: '0.5625rem', padding: '0.125rem 0.375rem', background: 'hsl(var(--secondary))', borderRadius: 'var(--radius-sm)', color: 'hsl(var(--muted-foreground))' }}>
                                                                {item.category3}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Action Button */}
                                                <div style={{ display: 'flex', gap: '0.375rem' }}>
                                                    <button
                                                      className="btn btn-outline btn-sm"
                                                      style={{
                                                          padding: '0.375rem',
                                                          minHeight: '32px',
                                                          width: '100%'
                                                      }}
                                                      // Add functionality later or remove if edit is not needed here
                                                    >
                                                        <PencilSimple size={14} /> Edit Item
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Ghost Items — Missing Pieces */}
                            {missingItems.length > 0 && (
                                <div style={{ marginTop: '1rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
                                        <Sparkle size={14} style={{ color: 'hsl(var(--accent))' }} />
                                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Complete the look</span>
                                        <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>{missingItems.length} missing</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                                        {missingItems.map((item, idx) => (
                                            <a
                                                key={idx}
                                                href={item.searchUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    minWidth: '140px', width: '140px',
                                                    border: '2px dashed hsl(var(--accent) / 0.4)',
                                                    borderRadius: 'var(--radius-lg)',
                                                    padding: '1rem 0.75rem',
                                                    background: 'hsl(var(--accent) / 0.05)',
                                                    display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    gap: '0.5rem', textDecoration: 'none',
                                                    flexShrink: 0, cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '50%',
                                                    background: 'hsl(var(--accent) / 0.15)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <ArrowSquareOut size={16} style={{ color: 'hsl(var(--accent))' }} />
                                                </div>
                                                <span style={{
                                                    fontSize: '0.6875rem', fontWeight: 600,
                                                    color: 'hsl(var(--foreground))', textAlign: 'center',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {item.term}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.5625rem',
                                                    color: 'hsl(var(--muted-foreground))',
                                                    textAlign: 'center', lineHeight: 1.3
                                                }}>
                                                    {item.description?.slice(0, 60)}...
                                                </span>
                                                <span style={{
                                                    fontSize: '0.5rem', fontWeight: 700,
                                                    color: 'hsl(var(--accent))',
                                                    textTransform: 'uppercase', letterSpacing: '0.05em'
                                                }}>Shop →</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Description Section */}
                            {outfitDescription && (
                                <div style={{ marginTop: '1rem', borderTop: '1px solid hsl(var(--border))', paddingTop: '0.75rem' }}>
                                    <button
                                        onClick={() => setIsDescriptionOpen(!isDescriptionOpen)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', fontSize: '0.8125rem', fontWeight: 600, color: 'hsl(var(--foreground))', cursor: 'pointer' }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Sparkle size={14} className="text-accent" />
                                            Why this outfit?
                                        </span>
                                        {isDescriptionOpen ? <CaretUp size={16} /> : <CaretDown size={16} />}
                                    </button>
                                    <AnimatePresence>
                                        {isDescriptionOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.5rem', lineHeight: '1.5' }}>
                                                    {outfitDescription}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State */}
            {hasItems && !outfit && !isGenerating && (
                <div style={{ paddingBottom: '2rem' }}>
                    {!moodFromUrl && !recentOutfits?.length && !savedOutfits?.length && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="empty-state"
                        >
                            <MagicWand className="empty-state-icon" />
                            <h3>Select a mood</h3>
                            <p className="text-sm">AI will style you from your closet</p>
                        </motion.div>
                    )}
                </div>
            )}




            {/* Preferences Flow */}
            <AnimatePresence>
                {showPreferences && (
                    <PreferencesFlow
                        isOpen={showPreferences}
                        onClose={() => setShowPreferences(false)}
                        onComplete={handlePreferencesComplete}
                        existingPreferences={preferences}
                        mode="edit"
                    />
                )}
            </AnimatePresence>

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
