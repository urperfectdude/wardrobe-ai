import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, Shirt, Wand2, ShoppingBag, ArrowRight, Upload, Brain, Store, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState } from 'react'

export default function Home() {
    const navigate = useNavigate()
    const [showPreferences, setShowPreferences] = useState(false)

    const features = [
        {
            icon: Upload,
            title: 'Upload Clothes',
            description: 'Snap photos of your clothes and build your digital wardrobe.'
        },
        {
            icon: Brain,
            title: 'AI Styling',
            description: 'Get outfit suggestions based on occasion and color theory.'
        },
        {
            icon: Store,
            title: 'Shop Smart',
            description: 'Find pieces from Myntra, Ajio, Amazon & more.'
        }
    ]

    const moods = [
        { id: 'party', emoji: '🎉', label: 'Party', color: 'hsl(350 80% 95%)', accent: 'hsl(350 80% 50%)' },
        { id: 'office', emoji: '💼', label: 'Office', color: 'hsl(220 60% 95%)', accent: 'hsl(220 60% 45%)' },
        { id: 'casual', emoji: '☕', label: 'Casual', color: 'hsl(30 60% 95%)', accent: 'hsl(30 60% 45%)' },
        { id: 'date', emoji: '💝', label: 'Date Night', color: 'hsl(330 80% 95%)', accent: 'hsl(330 80% 50%)' },
        { id: 'wedding', emoji: '💒', label: 'Wedding', color: 'hsl(45 80% 95%)', accent: 'hsl(45 80% 45%)' },
        { id: 'vacation', emoji: '🏖️', label: 'Vacation', color: 'hsl(180 60% 95%)', accent: 'hsl(180 60% 40%)' }
    ]

    const handleMoodSelect = (moodId) => {
        navigate(`/outfit?mood=${moodId}`)
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
                        <Sparkles size={14} />
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
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '0.75rem'
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
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    padding: '1.25rem 0.75rem',
                                    background: mood.color,
                                    border: `2px solid transparent`,
                                    borderRadius: 'var(--radius-xl)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = mood.accent
                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'transparent'
                                    e.currentTarget.style.transform = 'translateY(0)'
                                }}
                            >
                                <span style={{ fontSize: '2rem' }}>{mood.emoji}</span>
                                <span style={{
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: mood.accent
                                }}>{mood.label}</span>
                                <span style={{
                                    fontSize: '0.625rem',
                                    color: 'hsl(var(--muted-foreground))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}>
                                    <Wand2 size={10} />
                                    Get outfit
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
                        <Shirt size={16} />
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

            {/* Features */}
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
        </div>
    )
}
