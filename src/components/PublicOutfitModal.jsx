import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Shirt, Heart } from 'lucide-react'

export default function PublicOutfitModal({ isOpen, onClose, outfit }) {


    if (!isOpen || !outfit) return null

    const likedItems = outfit.items.filter(item => item.liked)

    return (
        <>
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                zIndex: 1000,
                overflowY: 'auto',
                padding: '1rem',
                paddingTop: '2rem',
                paddingBottom: '4rem'
            }} onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    style={{
                        background: 'hsl(var(--background))',
                        borderRadius: 'var(--radius-2xl)',
                        width: '100%',
                        maxWidth: '500px',
                        padding: '1.5rem',
                        position: 'relative',
                        boxShadow: 'var(--shadow-2xl)',
                        minHeight: '80vh'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1.5rem'
                    }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                                <span style={{ textTransform: 'capitalize' }}>{outfit.mood}</span> Outfit
                            </h2>
                            <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                                Shared by {outfit.user_profiles?.name || outfit.user_profiles?.username || 'Community Member'}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'hsl(var(--secondary))', border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* AI Reason */}
                    {(outfit.description || outfit.reason) && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '1rem',
                            background: 'hsl(var(--secondary))',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid hsl(var(--border))'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.5rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'hsl(var(--accent))'
                            }}>
                                ✨ Why this outfit?
                            </div>
                            <p style={{
                                fontSize: '0.8125rem',
                                color: 'hsl(var(--foreground))',
                                margin: 0,
                                lineHeight: 1.5
                            }}>
                                {outfit.description || outfit.reason}
                            </p>
                        </div>
                    )}

                    {/* Likes/Vibe */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1.5rem',
                        padding: '0.75rem',
                        background: 'hsl(var(--green-100) / 0.5)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid hsl(var(--green-600) / 0.1)'
                    }}>
                        <Heart size={16} fill="hsl(var(--green-600))" color="hsl(var(--green-600))" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--green-800))' }}>
                            {likedItems.length} items liked in this styling
                        </span>
                    </div>

                    {/* Items Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                        {outfit.items.map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                gap: '1rem',
                                background: item.liked ? 'white' : 'transparent',
                                padding: item.liked ? '0.75rem' : '0.25rem',
                                borderRadius: 'var(--radius-xl)',
                                border: item.liked ? '1px solid hsl(var(--border))' : 'none',
                                opacity: item.liked ? 1 : 0.6,
                                cursor: 'pointer',
                                transition: 'opacity 0.2s',
                            }}
                                onClick={() => {
                                    // No action on click for now
                                }}>
                                <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
                                    <img
                                        src={item.image}
                                        alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }}
                                    />
                                    {item.liked && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '-0.375rem',
                                            right: '-0.375rem',
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: 'hsl(var(--accent))',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '10px'
                                        }}>
                                            <Heart size={10} fill="currentColor" />
                                        </div>
                                    )}
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                                        <span style={{
                                            fontSize: '0.625rem',
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            background: item.source === 'closet' ? 'hsl(142 71% 45%)' : 'hsl(220 60% 50%)',
                                            color: 'white'
                                        }}>
                                            {item.source === 'closet' ? 'PRELOVED' : (item.platform || 'SHOP')}
                                        </span>
                                        {item.price && <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>₹{item.price}</span>}
                                    </div>
                                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
                                        {item.title || item.name}
                                    </h3>


                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </>
    )
}


