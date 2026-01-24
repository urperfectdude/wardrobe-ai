import { useState, useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Wand2, Shuffle, ShoppingBag, Sparkles, ArrowRight, X, Heart, Check, ExternalLink, Loader2, Shirt, ToggleLeft, ToggleRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getWardrobeItems, getProducts, savePreferences, getPreferences } from '../utils/storage'
import { generateOutfit, OCCASION_CATEGORIES } from '../utils/outfitMatcher'
import { EXISTING_CATEGORY4, EXISTING_COLORS } from '../utils/openaiAnalysis'

const OCCASIONS = [
    { id: 'party', emoji: '🎉', label: 'Party' },
    { id: 'office', emoji: '💼', label: 'Office' },
    { id: 'casual', emoji: '☕', label: 'Casual' },
    { id: 'date', emoji: '💝', label: 'Date Night' },
    { id: 'wedding', emoji: '💒', label: 'Wedding' },
    { id: 'vacation', emoji: '🏖️', label: 'Vacation' }
]

export default function GetOutfit() {
    const [searchParams] = useSearchParams()
    const moodFromUrl = searchParams.get('mood')
    const showPreferencesFromUrl = searchParams.get('preferences') === 'true'

    const [wardrobeItems, setWardrobeItems] = useState([])
    const [shopProducts, setShopProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOccasion, setSelectedOccasion] = useState(moodFromUrl || '')
    const [outfit, setOutfit] = useState(null)
    const [isGenerating, setIsGenerating] = useState(false)
    const [showPreferences, setShowPreferences] = useState(showPreferencesFromUrl)

    // Source toggle: 'closet' or 'shop' or 'both'
    const [source, setSource] = useState('both')

    // User preferences state
    const [preferences, setPreferences] = useState({
        favoriteStyles: [],
        favoriteColors: [],
        bodyType: '',
        preferredOccasions: []
    })
    const [savingPrefs, setSavingPrefs] = useState(false)

    // Load wardrobe items and shop products
    useEffect(() => {
        async function loadData() {
            try {
                const [items, products, savedPrefs] = await Promise.all([
                    getWardrobeItems().catch(() => []),
                    getProducts().catch(() => []),
                    getPreferences().catch(() => null)
                ])
                console.log('Loaded wardrobe:', items.length, 'Shop products:', products.length)
                setWardrobeItems(items)
                setShopProducts(products)
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

    // Auto-generate outfit when mood is passed via URL
    useEffect(() => {
        if (moodFromUrl && !loading && (wardrobeItems.length >= 1 || shopProducts.length >= 1)) {
            setSelectedOccasion(moodFromUrl)
            setTimeout(() => {
                generateOutfitWithProducts(moodFromUrl)
            }, 300)
        }
    }, [moodFromUrl, loading, wardrobeItems.length, shopProducts.length])

    const generateOutfitWithProducts = useCallback((occasion) => {
        setIsGenerating(true)

        setTimeout(() => {
            let outfitItems = []

            // Get items based on source toggle
            if (source === 'closet' || source === 'both') {
                const closetSuggestions = generateOutfit(wardrobeItems, occasion, 1)
                if (closetSuggestions[0]) {
                    outfitItems = closetSuggestions[0].items.map(item => ({
                        ...item,
                        source: 'closet'
                    }))
                }
            }

            if (source === 'shop' || source === 'both') {
                // Get shop products matching occasion
                const occasionInfo = OCCASION_CATEGORIES[occasion]
                let matchingProducts = shopProducts

                if (occasionInfo) {
                    matchingProducts = shopProducts.filter(product => {
                        const productStyle = (product.style || '').toLowerCase()
                        const productColor = (product.color || '').toLowerCase()

                        const styleMatch = occasionInfo.styles?.some(s =>
                            productStyle.includes(s.toLowerCase())
                        )
                        const colorMatch = occasionInfo.colors?.includes('any') ||
                            occasionInfo.colors?.some(c => productColor.includes(c))

                        return styleMatch || colorMatch
                    })
                }

                // If no matching products, use random
                if (matchingProducts.length === 0) {
                    matchingProducts = shopProducts
                }

                // Shuffle and pick products
                const shuffled = [...matchingProducts].sort(() => Math.random() - 0.5)
                const shopItems = shuffled.slice(0, source === 'shop' ? 3 : 2).map(p => ({
                    id: p.id,
                    image: p.image_url || p.image,
                    title: p.name,
                    category: p.category,
                    color: p.color,
                    source: 'shop',
                    productUrl: p.product_url,
                    price: p.price,
                    platform: p.platform
                }))

                if (source === 'shop') {
                    outfitItems = shopItems
                } else {
                    // Add shop items to complement closet items
                    outfitItems = [...outfitItems, ...shopItems]
                }
            }

            if (outfitItems.length > 0) {
                setOutfit({ items: outfitItems })
            } else {
                setOutfit(null)
            }

            setIsGenerating(false)
        }, 800)
    }, [wardrobeItems, shopProducts, source])

    const handleGenerateOutfit = useCallback(() => {
        if (!selectedOccasion) return
        generateOutfitWithProducts(selectedOccasion)
    }, [selectedOccasion, generateOutfitWithProducts])

    const handleShuffle = useCallback(() => {
        handleGenerateOutfit()
    }, [handleGenerateOutfit])

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

    const hasItems = wardrobeItems.length >= 1 || shopProducts.length >= 1

    if (loading) {
        return (
            <div className="container">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Get Your Outfit</h1>
                    <p className="text-muted text-sm">Loading...</p>
                </div>
                <div className="occasion-grid">
                    {[...Array(6)].map((_, idx) => (
                        <div key={idx} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-lg)' }} />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="container">
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Get Your Outfit</h1>
                <p className="text-muted text-sm">AI styles you from wardrobe + shop</p>
            </div>

            {/* Source Toggle */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1rem',
                background: 'hsl(var(--secondary))',
                padding: '0.375rem',
                borderRadius: 'var(--radius-lg)'
            }}>
                <button
                    onClick={() => setSource('closet')}
                    className={`btn btn-sm ${source === 'closet' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, minHeight: '36px', fontSize: '0.75rem' }}
                >
                    <Shirt size={14} />
                    My Closet
                </button>
                <button
                    onClick={() => setSource('both')}
                    className={`btn btn-sm ${source === 'both' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ flex: 1, minHeight: '36px', fontSize: '0.75rem' }}
                >
                    <Sparkles size={14} />
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
            {!hasItems && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'hsl(var(--green-100))',
                        border: '1px solid hsl(var(--accent) / 0.3)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '1.5rem',
                        textAlign: 'center',
                        marginBottom: '1.5rem'
                    }}
                >
                    <Sparkles size={28} style={{ color: 'hsl(var(--accent))', marginBottom: '0.75rem' }} />
                    <h3 style={{ marginBottom: '0.375rem', fontSize: '1rem' }}>No Items Available</h3>
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

            {/* Occasion Selection */}
            <section style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Select Occasion</h2>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem'
                }}>
                    {OCCASIONS.map((occasion) => (
                        <motion.button
                            key={occasion.id}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setSelectedOccasion(occasion.id)}
                            style={{
                                padding: '0.75rem 0.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.25rem',
                                border: selectedOccasion === occasion.id
                                    ? '2px solid hsl(var(--accent))'
                                    : '1px solid hsl(var(--border))',
                                borderRadius: 'var(--radius-lg)',
                                background: selectedOccasion === occasion.id
                                    ? 'hsl(var(--green-100))'
                                    : 'hsl(var(--card))',
                                cursor: 'pointer'
                            }}
                        >
                            <span style={{ fontSize: '1.25rem' }}>{occasion.emoji}</span>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>{occasion.label}</span>
                        </motion.button>
                    ))}
                </div>
            </section>

            {/* Generate Button */}
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    className="btn btn-primary w-full"
                    onClick={handleGenerateOutfit}
                    disabled={!selectedOccasion || isGenerating}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Styling...
                        </>
                    ) : (
                        <>
                            <Wand2 size={18} />
                            Generate Outfit
                        </>
                    )}
                </button>
            </div>

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
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '0.75rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <Sparkles size={14} style={{ color: 'hsl(var(--accent))' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--accent))' }}>
                                        AI Suggestion for {OCCASIONS.find(o => o.id === selectedOccasion)?.label}
                                    </span>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={handleShuffle} style={{ minHeight: '32px', padding: '0.25rem 0.5rem' }}>
                                    <Shuffle size={14} />
                                </button>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${Math.min(outfit.items.length, 3)}, 1fr)`,
                                gap: '0.5rem'
                            }}>
                                {outfit.items.map((item, idx) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.1 }}
                                        style={{ position: 'relative' }}
                                    >
                                        {/* Clickable if shop item */}
                                        {item.source === 'shop' && item.productUrl ? (
                                            <a
                                                href={item.productUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'block',
                                                    aspectRatio: '3/4',
                                                    borderRadius: 'var(--radius-lg)',
                                                    overflow: 'hidden',
                                                    position: 'relative',
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                <img
                                                    src={item.image}
                                                    alt={item.title || 'Item'}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                                {/* External link icon */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '0.25rem',
                                                    right: '0.25rem',
                                                    background: 'white',
                                                    borderRadius: '50%',
                                                    width: '1.25rem',
                                                    height: '1.25rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: 'var(--shadow-sm)'
                                                }}>
                                                    <ExternalLink size={10} />
                                                </div>
                                                {/* Bottom info */}
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    padding: '0.375rem',
                                                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                                    color: 'white'
                                                }}>
                                                    <div style={{ fontSize: '0.5rem', fontWeight: 600, background: 'hsl(var(--accent))', display: 'inline-block', padding: '0.0625rem 0.25rem', borderRadius: '4px', marginBottom: '0.125rem' }}>
                                                        🛒 {item.platform || 'Shop'}
                                                    </div>
                                                    <div style={{ fontSize: '0.625rem', fontWeight: 500 }}>
                                                        {item.title}
                                                    </div>
                                                    {item.price && (
                                                        <div style={{ fontSize: '0.6875rem', fontWeight: 600 }}>
                                                            ₹{item.price}
                                                        </div>
                                                    )}
                                                </div>
                                            </a>
                                        ) : (
                                            <div style={{
                                                aspectRatio: '3/4',
                                                borderRadius: 'var(--radius-lg)',
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }}>
                                                <img
                                                    src={item.image}
                                                    alt={item.title || item.category3 || 'Item'}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    padding: '0.375rem',
                                                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                                    color: 'white'
                                                }}>
                                                    <div style={{ fontSize: '0.5rem', fontWeight: 600, background: 'hsl(142 71% 45%)', display: 'inline-block', padding: '0.0625rem 0.25rem', borderRadius: '4px', marginBottom: '0.125rem' }}>
                                                        👕 My Closet
                                                    </div>
                                                    <div style={{ fontSize: '0.625rem', fontWeight: 500 }}>
                                                        {item.title || item.category3 || item.category}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State */}
            {hasItems && !outfit && !isGenerating && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="empty-state"
                >
                    <Wand2 className="empty-state-icon" />
                    <h3>Select an occasion</h3>
                    <p className="text-sm">AI will style you from {source === 'closet' ? 'your closet' : source === 'shop' ? 'shop items' : 'closet + shop'}</p>
                </motion.div>
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
                            paddingTop: '3rem',
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
                                    Your Style Preferences
                                </h3>
                                <button className="btn btn-icon btn-ghost btn-sm" onClick={() => setShowPreferences(false)}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Favorite Styles */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>
                                    Favorite Styles
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxHeight: '100px', overflowY: 'auto' }}>
                                    {EXISTING_CATEGORY4.map(style => (
                                        <button
                                            key={style}
                                            type="button"
                                            className={`chip chip-outline ${preferences.favoriteStyles?.includes(style) ? 'active' : ''}`}
                                            onClick={() => togglePreference('favoriteStyles', style)}
                                            style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem', minHeight: '26px' }}
                                        >
                                            {preferences.favoriteStyles?.includes(style) && <Check size={10} />}
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Favorite Colors */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.375rem' }}>
                                    Favorite Colors
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                    {EXISTING_COLORS.slice(0, 14).map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`chip chip-outline ${preferences.favoriteColors?.includes(color) ? 'active' : ''}`}
                                            onClick={() => togglePreference('favoriteColors', color)}
                                            style={{ fontSize: '0.625rem', padding: '0.25rem 0.5rem', minHeight: '26px' }}
                                        >
                                            {color}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                className="btn btn-primary w-full"
                                onClick={handleSavePreferences}
                                disabled={savingPrefs}
                            >
                                {savingPrefs ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Save Preferences
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Preferences Button */}
            {!showPreferences && (
                <div style={{ textAlign: 'center', paddingBottom: '1rem' }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowPreferences(true)}
                    >
                        <Heart size={14} />
                        Set Style Preferences
                    </button>
                </div>
            )}
        </div>
    )
}
