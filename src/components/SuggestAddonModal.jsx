import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Sparkle, SpinnerGap, ShoppingCart, ArrowSquareOut } from '@phosphor-icons/react'

/**
 * SuggestAddonModal — Shows AI-generated addon image with Buy Now link
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - suggestion: { category, color, style, description, reason } | null
 * - generatedImage: { base64, mimeType } | null
 * - loading: boolean (AI suggesting + generating image)
 * - loadingStatus: string (current step label)
 */
export default function SuggestAddonModal({ isOpen, onClose, suggestion, generatedImage, loading, loadingStatus }) {
    if (!isOpen) return null

    // Build Google Shopping search URL from suggestion
    const searchQuery = suggestion
        ? `${suggestion.color || ''} ${suggestion.description || suggestion.category || ''}`.trim()
        : ''
    const shopUrl = searchQuery
        ? `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchQuery)}`
        : '#'

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                style={{
                    background: 'hsl(var(--background))',
                    borderRadius: 'var(--radius-2xl)',
                    width: '100%',
                    maxWidth: '360px',
                    position: 'relative',
                    boxShadow: 'var(--shadow-2xl)',
                    overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '0.75rem', right: '0.75rem',
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)', border: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'white', zIndex: 10
                    }}
                >
                    <X size={14} weight="bold" />
                </button>

                {/* Loading State */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <SpinnerGap size={36} className="animate-spin" style={{ color: 'hsl(var(--primary))', marginBottom: '1rem' }} />
                        <p style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.375rem' }}>
                            {loadingStatus || 'Finding the perfect piece…'}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                            This may take a moment
                        </p>
                    </div>
                )}

                {/* Result */}
                {!loading && generatedImage && suggestion && (
                    <>
                        {/* Generated Image */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute', top: '0.75rem', left: '0.75rem',
                                padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-full)',
                                background: 'rgba(0,0,0,0.6)', color: 'white',
                                fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.02em',
                                display: 'flex', alignItems: 'center', gap: '0.3rem'
                            }}>
                                <Sparkle size={10} weight="fill" /> AI Suggested
                            </div>
                            <img
                                src={`data:${generatedImage.mimeType};base64,${generatedImage.base64}`}
                                alt="Suggested addon"
                                style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
                            />
                        </div>

                        {/* Info + Buy Now */}
                        <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
                            <p style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.25rem', lineHeight: 1.3 }}>
                                {suggestion.description}
                            </p>

                            {/* Tags */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.625rem' }}>
                                {suggestion.category && (
                                    <span style={{
                                        fontSize: '0.5625rem', fontWeight: 600, padding: '0.2rem 0.4rem',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))'
                                    }}>{suggestion.category}</span>
                                )}
                                {suggestion.color && (
                                    <span style={{
                                        fontSize: '0.5625rem', fontWeight: 600, padding: '0.2rem 0.4rem',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))'
                                    }}>{suggestion.color}</span>
                                )}
                                {suggestion.style && (
                                    <span style={{
                                        fontSize: '0.5625rem', fontWeight: 600, padding: '0.2rem 0.4rem',
                                        borderRadius: 'var(--radius-full)',
                                        background: 'hsl(var(--accent) / 0.1)', color: 'hsl(var(--accent))'
                                    }}>{suggestion.style}</span>
                                )}
                            </div>

                            {/* Reason */}
                            {suggestion.reason && (
                                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', margin: '0 0 1rem', lineHeight: 1.45 }}>
                                    ✨ {suggestion.reason}
                                </p>
                            )}

                            {/* Buy Now Button */}
                            <a
                                href={shopUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    padding: '0.75rem',
                                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 'var(--radius-lg)',
                                    fontSize: '0.875rem',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                <ShoppingCart size={16} weight="bold" />
                                Buy Now
                                <ArrowSquareOut size={12} style={{ opacity: 0.7 }} />
                            </a>
                        </div>
                    </>
                )}

                {/* Error / No result */}
                {!loading && !generatedImage && (
                    <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.25rem' }}>Couldn't generate a suggestion</p>
                        <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>Try selecting different items</p>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
