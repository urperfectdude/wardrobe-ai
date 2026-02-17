import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, ShareNetwork, DownloadSimple } from '@phosphor-icons/react'
import { useState } from 'react'
import { saveRecentToSaved } from '../utils/storage'

export default function ImagineMeResultModal({ isOpen, onClose, outfit }) {
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [isPublic, setIsPublic] = useState(false) // Added isPublic state

    if (!isOpen || !outfit) return null

    const handleSave = async () => {
        setSaving(true)
        try {
            await saveRecentToSaved(outfit.id, isPublic) // Pass isPublic status
            setSaved(true)
            // Auto close after success
            setTimeout(() => {
                onClose()
            }, 1500)
        } catch (error) {
            console.error('Failed to save:', error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 2000,
                        background: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '480px',
                            maxHeight: '90vh',
                            background: 'hsl(var(--card))',
                            borderRadius: 'var(--radius-xl)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: 'var(--shadow-xl)',
                            position: 'relative'
                        }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                zIndex: 10,
                                background: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={20} />
                        </button>

                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '1.5rem',
                            gap: '1.5rem',
                            overflowY: 'auto',
                            width: '100%'
                        }}>
                            {/* Main Result Image */}
                            <div style={{ 
                                width: '100%',
                                maxWidth: '320px', 
                                aspectRatio: '3/4',
                                background: '#000', 
                                borderRadius: 'var(--radius-xl)',
                                overflow: 'hidden',
                                boxShadow: 'var(--shadow-lg)',
                                flexShrink: 0
                            }}>
                                <img 
                                    src={outfit.imagine_on_avatar || outfit.items[0]?.image} 
                                    alt="Imagine result" 
                                    style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'contain' 
                                    }} 
                                />
                            </div>

                            {/* Items Used */}
                            <div style={{ width: '100%' }}>
                                <h3 style={{ fontSize: '0.875rem', marginBottom: '0.5rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items Used</h3>
                                <div style={{ 
                                    display: 'flex',
                                    justifyContent: 'center',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem'
                                }}>
                                    {outfit.items.map((item, idx) => (
                                        <div key={idx} style={{ 
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: 'var(--radius-md)', 
                                            overflow: 'hidden',
                                            border: '1px solid hsl(var(--border))',
                                            background: 'white'
                                        }}>
                                            <img 
                                                src={item.image} 
                                                alt="" 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Public Toggle */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                padding: '0.75rem 1rem',
                                background: 'hsl(var(--secondary) / 0.5)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid hsl(var(--border))'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Make Public</span>
                                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>Allow others to see this outfit</span>
                                </div>
                                <button
                                    onClick={() => setIsPublic(!isPublic)}
                                    style={{
                                        width: '44px',
                                        height: '24px',
                                        borderRadius: '12px',
                                        background: isPublic ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                                        position: 'relative',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <motion.div
                                        animate={{ x: isPublic ? 20 : 2 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            background: 'white',
                                            position: 'absolute',
                                            top: '2px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                        }}
                                    />
                                </button>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', width: '100%' }}>
                                <button 
                                    className="btn btn-primary"
                                    style={{ flex: 1, gap: '0.5rem', padding: '0.875rem', justifyContent: 'center' }}
                                    onClick={handleSave}
                                    disabled={saved || saving}
                                >
                                    <Heart weight={saved ? 'fill' : 'bold'} color={saved ? '#f43f5e' : 'currentColor'} />
                                    {saved ? 'Saved to Closet' : 'Save to Closet'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
