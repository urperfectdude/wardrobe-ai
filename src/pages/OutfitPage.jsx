import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, ShareNetwork, Sparkle, UserCircle } from '@phosphor-icons/react'
import { getOutfitById, getPublicProfileById, getLikeCount, hasLikedOutfit, likeOutfit, unlikeOutfit } from '../utils/social'
import { useAuth } from '../contexts/AuthContext'

export default function OutfitPage() {
    const { id } = useParams()
    const { user } = useAuth()
    const [outfit, setOutfit] = useState(null)
    const [owner, setOwner] = useState(null)
    const [likes, setLikes] = useState(0)
    const [hasLiked, setHasLiked] = useState(false)
    const [loading, setLoading] = useState(true)
    const [likeLoading, setLikeLoading] = useState(false)

    useEffect(() => {
        loadOutfit()
    }, [id])

    async function loadOutfit() {
        setLoading(true)
        try {
            const outfitData = await getOutfitById(id)
            if (!outfitData) { setLoading(false); return }
            setOutfit(outfitData)

            const [ownerData, likeCount, liked] = await Promise.all([
                getPublicProfileById(outfitData.user_id),
                getLikeCount(id),
                user ? hasLikedOutfit(id) : false
            ])
            setOwner(ownerData)
            setLikes(likeCount)
            setHasLiked(liked)
        } catch (err) {
            console.error('Error loading outfit:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleLike = async () => {
        if (!user) return
        setLikeLoading(true)
        try {
            if (hasLiked) {
                await unlikeOutfit(id)
                setHasLiked(false)
                setLikes(prev => prev - 1)
            } else {
                await likeOutfit(id)
                setHasLiked(true)
                setLikes(prev => prev + 1)
            }
        } catch (err) {
            console.error('Like error:', err)
        } finally {
            setLikeLoading(false)
        }
    }

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `${outfit?.occasion || 'Outfit'} Look`,
                url: window.location.href
            })
        } else {
            navigator.clipboard.writeText(window.location.href)
            alert('Link copied!')
        }
    }

    if (loading) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '3rem' }}>
                <p className="text-muted">Loading outfit...</p>
            </div>
        )
    }

    if (!outfit) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '3rem' }}>
                <h2>Outfit not found</h2>
                <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go Home</Link>
            </div>
        )
    }

    const items = outfit.items || []

    return (
        <div className="container" style={{ maxWidth: '600px' }}>
            {/* Back */}
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'hsl(var(--muted-foreground))', textDecoration: 'none', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                <ArrowLeft size={16} /> Back
            </Link>

            {/* Owner Header */}
            {owner && (
                <Link
                    to={owner.username ? `/user/${owner.username}` : '#'}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.625rem',
                        textDecoration: 'none', marginBottom: '1rem',
                        padding: '0.625rem', borderRadius: 'var(--radius-lg)',
                        background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))'
                    }}
                >
                    {owner.selfie_url || owner.avatar_url ? (
                        <img
                            src={owner.selfie_url || owner.avatar_url}
                            alt={owner.name}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                    ) : (
                        <UserCircle size={36} style={{ color: 'hsl(var(--muted-foreground))' }} />
                    )}
                    <div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                            {owner.name || 'Fashionista'}
                        </div>
                        {owner.username && (
                            <div style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>
                                @{owner.username}
                            </div>
                        )}
                    </div>
                </Link>
            )}

            {/* Outfit Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'hsl(var(--card))',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid hsl(var(--border))',
                    overflow: 'hidden'
                }}
            >
                <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Sparkle size={14} style={{ color: 'hsl(var(--accent))' }} />
                            <span style={{ fontSize: '0.9375rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                {outfit.occasion || outfit.mood || 'Styled'} Look
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={handleLike}
                                disabled={likeLoading || !user}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                                    padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-full)',
                                    border: '1px solid hsl(var(--border))',
                                    background: hasLiked ? 'hsl(var(--accent) / 0.1)' : 'transparent',
                                    color: hasLiked ? 'hsl(var(--accent))' : 'hsl(var(--foreground))',
                                    cursor: user ? 'pointer' : 'not-allowed',
                                    fontSize: '0.75rem', fontWeight: 600
                                }}
                            >
                                <Heart size={14} weight={hasLiked ? 'fill' : 'regular'} />
                                {likes}
                            </button>
                            <button
                                onClick={handleShare}
                                style={{
                                    display: 'flex', alignItems: 'center',
                                    padding: '0.375rem 0.625rem', borderRadius: 'var(--radius-full)',
                                    border: '1px solid hsl(var(--border))',
                                    background: 'transparent', cursor: 'pointer'
                                }}
                            >
                                <ShareNetwork size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Items Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, 1fr)`,
                        gap: '0.5rem'
                    }}>
                        {items.map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                style={{
                                    borderRadius: 'var(--radius-lg)',
                                    overflow: 'hidden',
                                    border: '1px solid hsl(var(--border))',
                                    background: 'white'
                                }}
                            >
                                <img
                                    src={item.image}
                                    alt={item.title || item.name || 'Item'}
                                    style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }}
                                />
                                <div style={{ padding: '0.5rem' }}>
                                    <p style={{
                                        fontSize: '0.6875rem', fontWeight: 600, margin: 0,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>
                                        {item.title || item.name}
                                    </p>
                                    {item.color && (
                                        <span style={{
                                            fontSize: '0.5625rem', color: 'hsl(var(--muted-foreground))'
                                        }}>{item.color}</span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Description */}
                    {outfit.reason && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'hsl(var(--muted) / 0.5)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.375rem' }}>
                                <Sparkle size={12} style={{ color: 'hsl(var(--accent))' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>AI Stylist Says</span>
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))', lineHeight: 1.5, margin: 0 }}>
                                {outfit.reason}
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
