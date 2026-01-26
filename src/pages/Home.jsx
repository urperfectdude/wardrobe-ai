import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkle, TShirt, MagicWand, ShoppingBag, ArrowRight, UploadSimple, Brain, Storefront, Heart } from '@phosphor-icons/react'
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

    useEffect(() => {
        async function fetchOutfits() {
            try {
                const outfits = await getPublicOutfits(8)
                setPublicOutfits(outfits)
            } catch (error) {
                console.error('Error fetching public outfits:', error)
            } finally {
                setLoadingOutfits(false)
            }
        }
        fetchOutfits()
    }, [])

    const features = [
        {
            icon: UploadSimple,
            title: 'Upload Clothes',
            description: 'Snap photos of your clothes and build your digital wardrobe.'
        },
        {
            icon: Brain,
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
            <section style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.375rem 0.75rem',
                        background: 'hsl(var(--green-100))',
                        borderRadius: 'var(--radius-full)',
                        marginBottom: '0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'hsl(var(--green-600))'
                    }}>
                        <Sparkle size={14} />
                        AI-Powered Fashion
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
                        marginBottom: '0.5rem',
                        lineHeight: 1.2
                    }}>
                        What's Your Mood Today?
                    </h1>

                    <p style={{
                        fontSize: '0.875rem',
                        color: 'hsl(var(--muted-foreground))',
                        maxWidth: '350px',
                        margin: '0 auto 1rem',
                        lineHeight: 1.5
                    }}>
                        Tap an occasion and get AI-styled outfits from your closet + shop recommendations
                    </p>
                </motion.div>
            </section>

            {/* Mood/Occasion Quick Selector - Main Feature */}
            <section style={{ padding: '0.5rem 0 1.5rem' }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                >
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem'
                    }}>
                        {moods.map((mood, idx) => (
                            <motion.button
                                key={mood.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.2, delay: 0.15 + idx * 0.04 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleMoodSelect(mood.id)}
                                style={{
                                    position: 'relative',
                                    aspectRatio: '1/1',
                                    overflow: 'hidden',
                                    border: 'none',
                                    borderRadius: 'var(--radius-lg)',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            >
                                <img
                                    src={mood.image}
                                    alt={mood.label}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                                {/* Black gradient overlay */}
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)'
                                }} />
                                {/* Label */}
                                <span style={{
                                    position: 'absolute',
                                    bottom: '0.625rem',
                                    left: '0.5rem',
                                    right: '0.5rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'white',
                                    textAlign: 'center'
                                }}>
                                    {mood.label}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* Quick Actions */}
            <section style={{ padding: '0.5rem 0 1rem' }}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    style={{ display: 'flex', gap: '0.5rem' }}
                >
                    <Link
                        to="/closet"
                        className="btn btn-primary"
                        style={{ flex: 1, justifyContent: 'center' }}
                    >
                        <TShirt size={16} />
                        My Closet
                    </Link>
                    <Link
                        to="/shop"
                        className="btn btn-outline"
                        style={{ flex: 1, justifyContent: 'center' }}
                    >
                        <ShoppingBag size={16} />
                        Shop
                    </Link>
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

            {/* Preferences CTA */}
            <section style={{ padding: '1rem 0 2rem' }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    style={{
                        background: 'linear-gradient(135deg, hsl(var(--green-100)), hsl(150 60% 95%))',
                        borderRadius: 'var(--radius-xl)',
                        padding: '1.25rem',
                        textAlign: 'center',
                        border: '1px solid hsl(var(--accent) / 0.3)'
                    }}
                >
                    <Heart size={24} style={{ color: 'hsl(var(--accent))', marginBottom: '0.5rem' }} />
                    <h2 style={{ fontSize: '1rem', marginBottom: '0.375rem' }}>Personalize Your Style</h2>
                    <p style={{
                        color: 'hsl(var(--muted-foreground))',
                        fontSize: '0.8125rem',
                        marginBottom: '0.75rem'
                    }}>
                        Tell us your preferences for better recommendations
                    </p>
                    <Link to="/outfit?preferences=true" className="btn btn-primary btn-sm">
                        <Sparkles size={14} />
                        Set Preferences
                    </Link>
                </motion.div>
            </section>

            {/* Public Outfits Feed */}
            {publicOutfits.length > 0 && (
                <section style={{ padding: '1.5rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>Recent Public Outfits</h2>
                        <Link to="/outfit" style={{ fontSize: '0.75rem', color: 'hsl(var(--accent))', fontWeight: 600, textDecoration: 'none' }}>View All</Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {publicOutfits.map((outfit) => (
                            <motion.div
                                key={outfit.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                style={{
                                    background: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: 'var(--radius-xl)',
                                    padding: '1rem',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                            >
                                {/* User Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    {outfit.user_profiles?.avatar_url ? (
                                        <img
                                            src={outfit.user_profiles.avatar_url}
                                            alt=""
                                            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: 'hsl(var(--accent))', color: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75rem', fontWeight: 600
                                        }}>
                                            {(outfit.user_profiles?.name?.[0] || outfit.user_profiles?.username?.[0] || 'U').toUpperCase()}
                                        </div>
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.8125rem', fontWeight: 700, margin: 0 }}>
                                            {outfit.user_profiles?.name || outfit.user_profiles?.username || 'Anonymous User'}
                                        </p>
                                        <p style={{ fontSize: '0.625rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                                            Created a <span style={{ textTransform: 'capitalize', color: 'hsl(var(--foreground))', fontWeight: 600 }}>{outfit.mood}</span> outfit
                                        </p>
                                    </div>
                                </div>

                                {/* Liked Items Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                                    {outfit.items.filter(item => item.liked).slice(0, 4).map((item, i) => (
                                        <div key={i} style={{
                                            position: 'relative',
                                            aspectRatio: '1/1',
                                            borderRadius: 'var(--radius-lg)',
                                            overflow: 'hidden',
                                            border: '1px solid hsl(var(--border))'
                                        }}>
                                            <img
                                                src={item.image}
                                                alt=""
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0, left: 0, right: 0,
                                                padding: '0.375rem',
                                                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                                                color: 'white'
                                            }}>
                                                <div style={{
                                                    fontSize: '0.5rem',
                                                    fontWeight: 700,
                                                    background: item.source === 'closet' ? 'hsl(142 71% 45%)' : 'hsl(220 60% 50%)',
                                                    display: 'inline-block',
                                                    padding: '1px 4px',
                                                    borderRadius: '2px',
                                                    marginBottom: '2px'
                                                }}>
                                                    {item.source === 'closet' ? 'PRELOVED' : (item.platform || 'SHOP')}
                                                </div>
                                                <div style={{ fontSize: '0.625rem', fontWeight: 500 }}>
                                                    {item.title || item.name}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Main Actions */}
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        style={{ flex: 1, fontSize: '0.75rem', minHeight: '36px' }}
                                        onClick={() => navigate(`/outfit?mood=${outfit.mood}`)}
                                    >
                                        Try Similar
                                    </button>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        style={{ flex: 1, fontSize: '0.75rem', minHeight: '36px' }}
                                        onClick={() => setSelectedOutfit(outfit)}
                                    >
                                        View Details
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
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
