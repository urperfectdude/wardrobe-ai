import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2, IndianRupee, MessageCircle } from 'lucide-react'
import { sendPurchaseRequest } from '../utils/storage'

export default function MakeOfferModal({ isOpen, onClose, item, sellerId }) {
    const [offerPrice, setOfferPrice] = useState('')
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!offerPrice || submitting) return

        setSubmitting(true)
        try {
            await sendPurchaseRequest(
                item.id || 'temp-id', // item.id might be internal or placeholder for public feed
                sellerId,
                parseFloat(offerPrice),
                message
            )
            setSuccess(true)
            setTimeout(() => {
                onClose()
            }, 2000)
        } catch (error) {
            console.error('Failed to send offer:', error)
            alert('Failed to send offer. Make sure you are signed in.')
        } finally {
            setSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem'
        }} onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                    background: 'white',
                    borderRadius: 'var(--radius-xl)',
                    width: '100%',
                    maxWidth: '400px',
                    padding: '1.5rem',
                    position: 'relative',
                    boxShadow: 'var(--shadow-lg)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'hsl(var(--muted-foreground))'
                    }}
                >
                    <X size={20} />
                </button>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'hsl(var(--green-100))', color: 'hsl(var(--green-600))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1rem'
                        }}>
                            <Check size={32} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Offer Sent!</h2>
                        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem' }}>
                            The owner has been notified. You'll hear back soon.
                        </p>
                    </div>
                ) : (
                    <>
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Make an Offer</h2>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                            <img
                                src={item.image}
                                alt=""
                                style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
                            />
                            <div>
                                <h3 style={{ fontSize: '0.9375rem', margin: 0 }}>{item.title || item.name}</h3>
                                <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                                    Preloved item from community
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                                    Your Price Offer
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }}>
                                        <IndianRupee size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                    </div>
                                    <input
                                        type="number"
                                        className="input"
                                        placeholder="Enter amount"
                                        value={offerPrice}
                                        onChange={e => setOfferPrice(e.target.value)}
                                        style={{ paddingLeft: '2.5rem' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.375rem' }}>
                                    Message to Owner (Optional)
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '0.875rem', top: '0.875rem' }}>
                                        <MessageCircle size={16} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                    </div>
                                    <textarea
                                        className="input"
                                        placeholder="Ask about size, condition, etc."
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        style={{ paddingLeft: '2.5rem', minHeight: '80px', paddingTop: '0.75rem', resize: 'none' }}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary w-full"
                                disabled={submitting || !offerPrice}
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Send Offer'}
                            </button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    )
}
