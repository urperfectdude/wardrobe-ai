import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkle, User, ArrowRight } from '@phosphor-icons/react'

export default function MissingDataModal({ isOpen, onClose, onUpdateProfile, onProceed }) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }} onClick={onClose}>
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'hsl(var(--card))',
                        borderRadius: 'var(--radius-xl)',
                        maxWidth: '400px',
                        width: '100%',
                        padding: '1.5rem',
                        position: 'relative',
                        boxShadow: 'var(--shadow-2xl)'
                    }}
                >
                    <button 
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'hsl(var(--muted-foreground))'
                        }}
                    >
                        <X size={20} />
                    </button>

                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ 
                            width: '48px', height: '48px', 
                            background: 'hsl(var(--primary) / 0.1)', 
                            borderRadius: '50%', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1rem',
                            color: 'hsl(var(--primary))'
                        }}>
                            <Sparkle size={24} weight="fill" />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Enhance Your Result?</h2>
                        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>
                            We notice your profile is missing some details (Selfie, Skin Tone, or Body Type). 
                            Adding these helps AI create a much more realistic "Imagine Me" result.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button 
                            className="btn btn-primary"
                            onClick={onUpdateProfile}
                            style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                width: '100%'
                            }}
                        >
                            <User size={18} />
                            Update Profile Details
                        </button>
                        
                        <button 
                            className="btn btn-ghost"
                            onClick={onProceed}
                            style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                width: '100%',
                                fontSize: '0.875rem',
                                color: 'hsl(var(--muted-foreground))'
                            }}
                        >
                            Use Default Model
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
