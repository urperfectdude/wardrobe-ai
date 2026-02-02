import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkle, TShirt, MagicWand, ShoppingBag, ArrowRight, UploadSimple, Lightning, Storefront, Heart } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { getPublicOutfits } from '../utils/storage'
import { useAuth } from '../contexts/AuthContext'
import OnboardingFlow from '../components/OnboardingFlow'
import PublicOutfitModal from '../components/PublicOutfitModal'

export default function Home() {
    const navigate = useNavigate()
    const { user, loading: authLoading } = useAuth()
    const [publicOutfits, setPublicOutfits] = useState([])
    const [loadingOutfits, setLoadingOutfits] = useState(true)
    const [selectedOutfit, setSelectedOutfit] = useState(null)
    const [showLogin, setShowLogin] = useState(false)
    const [pendingMood, setPendingMood] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [offset, setOffset] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const LIMIT = 8

    async function fetchOutfits(newOffset = 0) {
        try {
            setLoadingOutfits(true)
            const outfits = await getPublicOutfits(LIMIT, newOffset)

            if (newOffset === 0) {
                setPublicOutfits(outfits)
            } else {
                setPublicOutfits(prev => [...prev, ...outfits])
            }

            setHasMore(outfits.length === LIMIT)
            setOffset(newOffset)
        } catch (error) {
            console.error('Error fetching public outfits:', error)
        } finally {
            setLoadingOutfits(false)
        }
    }

    useEffect(() => {
        fetchOutfits(0)
    }, [])

    const handleLoadMore = () => {
        fetchOutfits(offset + LIMIT)
    }

    const features = [
        {
            icon: UploadSimple,
            title: 'Upload Clothes',
            description: 'Snap photos of your clothes and build your digital wardrobe.'
        },
        {
            icon: Lightning,
            title: 'AI Styling',
            description: 'Get outfit suggestions based on occasion and color theory.'
        },
        {
            icon: Storefront,
            title: 'Shop Smart',
            description: 'Find pieces from Myntra, Ajio, Amazon & more.'
        }
    ]

    const moods = [
        { id: 'party', label: 'Party', image: '/moods/party.png' },
        { id: 'office', label: 'Office', image: '/moods/office.png' },
        { id: 'casual', label: 'Casual', image: '/moods/casual.png' },
        { id: 'date', label: 'Date Night', image: '/moods/date.png' },
        { id: 'wedding', label: 'Wedding', image: '/moods/wedding.png' },
        { id: 'vacation', label: 'Vacation', image: '/moods/vacation.png' }
    ]

    const handleMoodSelect = (moodId) => {
        if (!user) {
            setPendingMood(moodId)
            setShowLogin(true)
            return
        }
        navigate(`/outfit?mood=${moodId}`)
    }

    const handleLoginComplete = () => {
        setShowLogin(false)
        if (pendingMood) {
            navigate(`/outfit?mood=${pendingMood}`)
            setPendingMood(null)
        }
    }

    return (
        <div className="container">
            {/* Hero Section */}
            <section style={{ textAlign: 'center', padding: '2rem 0 1.5rem' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.375rem 0.75rem',
                        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.15))',
                        borderRadius: 'var(--radius-full)',
                        marginBottom: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'hsl(var(--primary))'
                    }}>
                        <Sparkle size={14} weight="fill" />
                        Your AI Stylist
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(1.25rem, 4.5vw, 1.75rem)',
                        marginBottom: '0.5rem',
                        lineHeight: 1.2,
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--primary)))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        whiteSpace: 'nowrap'
                    }}>
                        Never wonder what to wear again
                    </h1>

                    <p style={{
                        fontSize: '0.875rem',
                        color: 'hsl(var(--muted-foreground))',
                        maxWidth: '300px',
                        margin: '0 auto 1.5rem',
                        lineHeight: 1.4
                    }}>
                        AI creates outfit from your wardrobe & finds missing pieces instantly
                    </p>
                </motion.div>
            </section>

            {/* ChatGPT-Style Input Section */}
            <section style={{ padding: '0 0 1.5rem' }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                >
                    {/* Input Box */}
                    <div style={{
                        position: 'relative',
                        marginBottom: '1rem'
                    }}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchQuery.trim()) {
                                    handleMoodSelect(searchQuery.trim())
                                }
                            }}
                            placeholder="What's the vibe today?"
                            style={{
                                width: '100%',
                                padding: '1rem 3.5rem 1rem 1rem',
                                fontSize: '1rem',
                                border: '2px solid hsl(var(--border))',
                                borderRadius: 'var(--radius-xl)',
                                background: 'hsl(var(--card))',
                                color: 'hsl(var(--foreground))',
                                outline: 'none',
                                transition: 'border-color 0.2s, box-shadow 0.2s'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'hsl(var(--primary))'
                                e.target.style.boxShadow = '0 0 0 4px hsl(var(--primary) / 0.1)'
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'hsl(var(--border))'
                                e.target.style.boxShadow = 'none'
                            }}
                        />
                        <button
                            onClick={() => searchQuery.trim() && handleMoodSelect(searchQuery.trim())}
                            disabled={!searchQuery.trim()}
                            style={{
                                position: 'absolute',
                                right: '0.5rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: 'var(--radius-lg)',
                                border: 'none',
                                background: searchQuery.trim() ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                                color: searchQuery.trim() ? 'white' : 'hsl(var(--muted-foreground))',
                                cursor: searchQuery.trim() ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 0.2s'
                            }}
                        >
                            <MagicWand size={18} weight="fill" />
                        </button>
                    </div>

                    {/* Mood/Occasion Chips */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        justifyContent: 'center'
                    }}>
                        {[
                            'Casual', 'Work', 'Date Night', 'Party', 'Vacation',
                            'Wedding', 'Brunch', 'Gym', 'Cozy Night In', 'Interview'
                        ].map((chip, idx) => (
                            <motion.button
                                key={chip}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2, delay: 0.2 + idx * 0.03 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setSearchQuery(chip)
                                    handleMoodSelect(chip)
                                }}
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
                                {chip}
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </section>



            {/* How It Works */}
            <section style={{ padding: '1rem 0' }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                >
                    <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                        How It Works
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {features.map((feature, idx) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.35 + idx * 0.05 }}
                                className="card"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem'
                                }}
                            >
                                <div style={{
                                    width: '2.25rem',
                                    height: '2.25rem',
                                    background: 'hsl(var(--primary))',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    flexShrink: 0
                                }}>
                                    <feature.icon size={16} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '0.8125rem', marginBottom: '0.125rem' }}>{feature.title}</h3>
                                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                                        {feature.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </section>


            {/* Public Outfits Feed */}
            {publicOutfits.length > 0 && (
                <section style={{ padding: '1.5rem 0' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Recent Public Outfits</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {publicOutfits.map((outfit) => (
                            <motion.div
                                key={outfit.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                onClick={() => setSelectedOutfit(outfit)}
                                style={{
                                    background: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius-xl)',
                                    padding: '1rem',
                                    boxShadow: 'var(--shadow-sm)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                }}
                                whileHover={{ scale: 1.01, boxShadow: 'var(--shadow-md)' }}
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
                                            onClick={(e) => { e.stopPropagation(); handleMoodSelect(outfit.mood); }}
                                        >
                                            Try '{outfit.mood}' Outfit
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {hasMore && (
                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <button
                                className="btn btn-outline"
                                onClick={handleLoadMore}
                                disabled={loadingOutfits}
                                style={{ minWidth: '150px' }}
                            >
                                {loadingOutfits ? (
                                    <Sparkle className="animate-spin" size={16} />
                                ) : (
                                    <>
                                        Load More
                                        <ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </section>
            )}

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

            {/* Login Modal */}
            <AnimatePresence>
                {showLogin && (
                    <OnboardingFlow
                        isOpen={showLogin}
                        onClose={() => { setShowLogin(false); setPendingMood(null) }}
                        onComplete={handleLoginComplete}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
