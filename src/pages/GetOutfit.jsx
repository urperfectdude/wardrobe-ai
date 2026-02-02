import { useState, useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MagicWand, Shuffle, ShoppingBag, Sparkle, ArrowRight, X, Heart, Check, ArrowSquareOut, SpinnerGap, TShirt, Gear, PencilSimple, CaretDown, CaretUp, ClockCounterClockwise, BookmarkSimple } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { getWardrobeItems, getProducts, savePreferences, getPreferences, saveOutfit, markOutfitAsSaved, getRecentOutfits, getSavedOutfits, saveRecentOutfit, saveRecentToSaved } from '../utils/storage'
import { generateOutfit, OCCASION_CATEGORIES } from '../utils/outfitMatcher'
import { EXISTING_CATEGORY4, EXISTING_COLORS, generateOutfitDescription } from '../utils/openaiAnalysis'
import { useAuth } from '../contexts/AuthContext'
import OnboardingFlow from '../components/OnboardingFlow'
import DualRangeSlider from '../components/DualRangeSlider'
import ParameterSelector from '../components/ParameterSelector'

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
    const [shopProducts, setShopProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedMood, setSelectedMood] = useState(moodFromUrl || 'party')
    const [outfit, setOutfit] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [outfitDescription, setOutfitDescription] = useState('')
    const [isDescriptionOpen, setIsDescriptionOpen] = useState(false)
    const [activeOutfitId, setActiveOutfitId] = useState(null)
    const [showPreferences, setShowPreferences] = useState(showPreferencesFromUrl)

    // Source toggle: 'closet' or 'shop' or 'both'
    const [source, setSource] = useState('both')

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
    const [savingPrefs, setSavingPrefs] = useState(false)
    const [recentOutfits, setRecentOutfits] = useState([])
    const [savedOutfits, setSavedOutfits] = useState([])
    const [isPublic, setIsPublic] = useState(false)
    const [isSavingOutfit, setIsSavingOutfit] = useState(false)
    const { user } = useAuth()

    // Load wardrobe items and shop products
    useEffect(() => {
        async function loadData() {
            try {
                const [items, products, savedPrefs, recent, saved] = await Promise.all([
                    getWardrobeItems().catch(() => []),
                    getProducts().catch(() => []),
                    getPreferences().catch(() => null),
                    getRecentOutfits().catch(() => []),
                    getSavedOutfits().catch(() => [])
                ])
                setWardrobeItems(items)
                setShopProducts(products)
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
        if (moodFromUrl && !loading && (wardrobeItems.length >= 1 || shopProducts.length >= 1)) {
            setSelectedMood(moodFromUrl)
            setTimeout(() => {
                generateOutfitWithProducts(moodFromUrl)
            }, 300)
        }
    }, [moodFromUrl, loading, wardrobeItems.length, shopProducts.length])

    const generateOutfitWithProducts = useCallback((mood) => {
        setIsGenerating(true)
        setOutfit(null) // Clear previous while generating

        setTimeout(async () => {
            let outfitItems = []

            // Get items based on source toggle
            if (source === 'closet' || source === 'both') {
                const closetSuggestions = generateOutfit(wardrobeItems, mood, 1)
                if (closetSuggestions[0]) {
                    outfitItems = closetSuggestions[0].items.map(item => ({
                        ...item,
                        source: 'closet'
                    }))
                }
            }

            if (source === 'shop' || source === 'both') {
                const occasionInfo = OCCASION_CATEGORIES[mood]
                let matchingProducts = shopProducts

                if (occasionInfo) {
                    matchingProducts = shopProducts.filter(product => {
                        const matchesStyle = occasionInfo.styles?.some(
                            style => product.category4?.toLowerCase().includes(style.toLowerCase())
                        )
                        return matchesStyle || Math.random() > 0.7
                    })
                }

                if (matchingProducts.length === 0) {
                    matchingProducts = shopProducts
                }

                const shuffled = [...matchingProducts].sort(() => Math.random() - 0.5)
                const shopSuggestions = shuffled.slice(0, source === 'shop' ? 4 : 2).map(p => ({
                    ...p,
                    source: 'shop'
                }))

                outfitItems = [...outfitItems, ...shopSuggestions]
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
            } else {
                setOutfit(null)
                setOutfitDescription('')
            }

            setIsGenerating(false)
        }, 800)
    }, [wardrobeItems, shopProducts, source, preferences])


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


    const togglePreference = (type, value) => {
        setPreferences(prev => {
            const current = prev[type] || []
            const updated = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value]
            return { ...prev, [type]: updated }
        })
    }

    const handleSavePreferences = async () => {
        setSavingPrefs(true)
        try {
            await savePreferences(preferences)
            setShowPreferences(false)
        } catch (error) {
            console.error('Failed to save preferences:', error)
        } finally {
            setSavingPrefs(false)
        }
    }

    const handleOutfitClick = (histOutfit) => {
        setOutfit({ mood: histOutfit.mood, items: histOutfit.items })
        setOutfitDescription(histOutfit.description || '')
        setActiveOutfitId(histOutfit.id)
        setIsDescriptionOpen(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const hasItems = wardrobeItems.length >= 1 || shopProducts.length >= 1

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
                    <p className="text-muted text-sm">AI styles you from wardrobe + shop</p>
                </div>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowPreferences(true)}
                    style={{ gap: '0.25rem', fontSize: '0.75rem' }}
                >
                    <Gear size={16} />
                    Preferences
                </button>
            </div>

            {/* Source Toggle */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '0.75rem',
                background: 'hsl(var(--secondary))',
                padding: '0.375rem',
                borderRadius: 'var(--radius-lg)'
            }}>
                <button
                    onClick={() => setSource('closet')}
                    className={`btn btn-sm ${source === 'closet' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, minHeight: '36px', fontSize: '0.75rem' }}
                >
                    <TShirt size={14} />
                    My Closet
                </button>
                <button
                    onClick={() => setSource('both')}
                    className={`btn btn-sm ${source === 'both' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, minHeight: '36px', fontSize: '0.75rem' }}
                >
                    <Sparkle size={14} />
                    Both
                </button>
                <button
                    onClick={() => setSource('shop')}
                    className={`btn btn-sm ${source === 'shop' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, minHeight: '36px', fontSize: '0.75rem' }}
                >
                    <ShoppingBag size={14} />
                    Shop Only
                </button>
            </div>



            {/* Warning if not enough items */}
            {/* Warning if no wardrobe items and source includes closet */}
            {(source !== 'shop' && wardrobeItems.length === 0) && (
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
                        Add items to your closet or check the shop
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Link to="/closet" className="btn btn-primary btn-sm">
                            Add Clothes
                        </Link>
                        <Link to="/shop" className="btn btn-outline btn-sm">
                            Browse Shop
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
                                            <a
                                                href={item.source === 'shop' ? (item.url || item.product_url) : '#'}
                                                target={item.source === 'shop' ? "_blank" : undefined}
                                                rel="noopener noreferrer"
                                                onClick={(e) => {
                                                    if (item.source !== 'shop') e.preventDefault()
                                                }}
                                                style={{ display: 'block', position: 'relative', aspectRatio: '3/4', cursor: item.source === 'shop' ? 'pointer' : 'default' }}
                                            >
                                                <img
                                                    src={item.image}
                                                    alt={item.title || item.name || 'Item'}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                                {/* Badge */}
                                                {item.source === 'shop' ? (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '0.5rem',
                                                        left: '0.5rem',
                                                        padding: '0.25rem 0.5rem',
                                                        background: item.platform === 'Myntra' ? '#ff3f6c' :
                                                            item.platform === 'Ajio' ? '#505050' :
                                                                item.platform === 'Amazon' ? '#ff9900' :
                                                                    'hsl(220 60% 50%)',
                                                        color: 'white',
                                                        fontSize: '0.5625rem',
                                                        fontWeight: 700,
                                                        borderRadius: 'var(--radius-sm)',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em'
                                                    }}>
                                                        {item.platform || 'Shop'}
                                                    </div>
                                                ) : (
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
                                                )}

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
                                            </a>

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
                                                {item.source === 'shop' && item.price ? (
                                                    <p style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0, marginBottom: '0.5rem' }}>
                                                        ₹{item.price.toLocaleString()}
                                                    </p>
                                                ) : (
                                                    <>
                                                        {(item.category3 || item.category4) && (
                                                            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                                                {item.category3 && (
                                                                    <span style={{ fontSize: '0.5625rem', padding: '0.125rem 0.375rem', background: 'hsl(var(--secondary))', borderRadius: 'var(--radius-sm)', color: 'hsl(var(--muted-foreground))' }}>
                                                                        {item.category3}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* Action Button */}
                                                {item.source === 'shop' ? (
                                                    <a
                                                        href={item.url || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn btn-primary btn-sm w-full"
                                                        style={{
                                                            fontSize: '0.6875rem',
                                                            minHeight: '32px',
                                                            gap: '0.25rem'
                                                        }}
                                                    >
                                                        <ArrowSquareOut size={12} />
                                                        Buy Now
                                                    </a>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                                                        <a
                                                            href="https://qilin.in"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-primary btn-sm"
                                                            style={{
                                                                flex: 1,
                                                                fontSize: '0.6875rem',
                                                                minHeight: '32px'
                                                            }}
                                                        >
                                                            Sell it
                                                        </a>
                                                        <button
                                                            className="btn btn-outline btn-sm"
                                                            style={{
                                                                padding: '0.375rem',
                                                                minHeight: '32px'
                                                            }}
                                                        >
                                                            <PencilSimple size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

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
                            <p className="text-sm">AI will style you from {source === 'closet' ? 'your closet' : source === 'shop' ? 'shop items' : 'closet + shop'}</p>
                        </motion.div>
                    )}
                </div>
            )}




            {/* Preferences Modal */}
            <AnimatePresence>
                {showPreferences && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '1rem',
                            overflowY: 'auto',
                            paddingTop: '2rem',
                            paddingBottom: '6rem'
                        }}
                        onClick={() => setShowPreferences(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="card"
                            style={{ maxWidth: '400px', width: '100%', padding: '1.25rem' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.125rem', margin: 0 }}>
                                    <Heart size={18} style={{ color: 'hsl(var(--accent))', marginRight: '0.375rem' }} />
                                    Style Preferences
                                </h3>
                                <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setShowPreferences(false)}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Thrift Preference */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>Source Preference</label>
                                <div style={{ display: 'flex', background: 'hsl(var(--secondary))', borderRadius: 'var(--radius-md)', padding: '3px' }}>
                                    {['new', 'both', 'thrifted'].map(opt => (
                                        <button
                                            key={opt}
                                            className={`btn btn-sm ${preferences.thriftPreference === opt ? 'btn-white shadow-sm' : 'btn-ghost'}`}
                                            onClick={() => setPreferences(prev => ({ ...prev, thriftPreference: opt }))}
                                            style={{
                                                flex: 1,
                                                textTransform: 'capitalize',
                                                fontSize: '0.75rem',
                                                height: '28px',
                                                color: preferences.thriftPreference === opt ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'
                                            }}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preferred Styles */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>
                                    Preferred Styles
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxHeight: '80px', overflowY: 'auto' }}>
                                    {EXISTING_CATEGORY4.slice(0, 15).map(style => (
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
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>
                                    Fit Type
                                </label>
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
                            <div style={{ marginBottom: '1rem' }}>
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
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>
                                    Preferred Colors
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    {EXISTING_COLORS.slice(0, 12).map(color => (
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
                            <div style={{ marginBottom: '1rem' }}>
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
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                                    Budget Range
                                </label>
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

                            <button
                                className="btn btn-primary w-full"
                                onClick={handleSavePreferences}
                                disabled={savingPrefs}
                            >
                                {savingPrefs ? <SpinnerGap size={16} className="animate-spin" /> : <Check size={16} />}
                                Save Preferences
                            </button>

                        </motion.div>
                    </motion.div>
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
