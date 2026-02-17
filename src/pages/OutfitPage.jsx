import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, ShareNetwork, Sparkle, UserCircle } from '@phosphor-icons/react'
import { getOutfitById, getPublicProfileById, getLikeCount, hasLikedOutfit, likeOutfit, unlikeOutfit, isFollowing, followUser, unfollowUser } from '../utils/social'
import { updateRecentOutfit } from '../utils/storage'
import { generateTryOn } from '../utils/generateTryOn'
import MissingDataModal from '../components/MissingDataModal'
import { useAuth } from '../contexts/AuthContext'

export default function OutfitPage() {
    const { id } = useParams()
    const { user, userProfile } = useAuth()
    const [outfit, setOutfit] = useState(null)
    const [owner, setOwner] = useState(null)
    const [likes, setLikes] = useState(0)
    const [hasLiked, setHasLiked] = useState(false)
    const [loading, setLoading] = useState(true)
    const [likeLoading, setLikeLoading] = useState(false)
    const [isFollowingOwner, setIsFollowingOwner] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    
    // Try-On State
    const [tryOnLoading, setTryOnLoading] = useState(false)
    const [showMissingModal, setShowMissingModal] = useState(false)

    useEffect(() => {
        loadOutfit()
    }, [id])

    async function loadOutfit() {
        setLoading(true)
        try {
            const outfitData = await getOutfitById(id)
            if (!outfitData) { setLoading(false); return }
            setOutfit(outfitData)

            const [ownerData, likeCount, liked, following] = await Promise.all([
                getPublicProfileById(outfitData.user_id),
                getLikeCount(id),
                user ? hasLikedOutfit(id) : false,
                user && outfitData.user_id !== user.id ? isFollowing(outfitData.user_id) : false
            ])
            setOwner(ownerData)
            setLikes(likeCount)
            setHasLiked(liked)
            setIsFollowingOwner(following)
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
                setLikes(prev => Math.max(0, prev - 1))
            } else {
                await likeOutfit(id)
                setHasLiked(true)
                setLikes(prev => prev + 1)
            }
        } catch (err) {
            console.error('Like error:', err)
            // Revert on error if needed, but for now just log
        } finally {
            setLikeLoading(false)
        }
    }

    const handleFollow = async (e) => {
        e.preventDefault() 
        e.stopPropagation()
        if (!user || !owner) return
        setFollowLoading(true)
        try {
            if (isFollowingOwner) {
                await unfollowUser(owner.user_id)
                setIsFollowingOwner(false)
            } else {
                await followUser(owner.user_id)
                setIsFollowingOwner(true)
            }
        } catch (err) {
            console.error('Follow error:', err)
        } finally {
            setFollowLoading(false)
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

    const handleImagineMeStart = () => {
        if (!user) return // Should prompt login?
        
        const isProfileComplete = userProfile?.selfie_url && userProfile?.body_type && userProfile?.skin_color
        if (!isProfileComplete) {
            setShowMissingModal(true)
        } else {
            executeTryOn()
        }
    }

    const executeTryOn = async () => {
        setShowMissingModal(false)
        setTryOnLoading(true)
        try {
            // Generate
            const url = await generateTryOn(
                {
                    gender: userProfile?.gender || 'woman',
                    age: userProfile?.age,
                    bodyType: userProfile?.body_type,
                    skinColor: userProfile?.skin_color,
                    hairColor: userProfile?.hair_color
                },
                outfit.items,
                userProfile?.selfie_url
            )

            // Update DB
            await updateRecentOutfit(id, { imagine_on_avatar: url })
            
            // Update Local State
            setOutfit(prev => ({ ...prev, imagine_on_avatar: url }))

        } catch (error) {
            console.error('Try-On failed:', error)
            alert('Failed to generate try-on. Please try again.')
        } finally {
            setTryOnLoading(false)
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
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'hsl(var(--foreground))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {owner.name || 'Fashionista'}
                            {user && user.id !== owner.user_id && (
                                <button
                                    onClick={handleFollow}
                                    disabled={followLoading}
                                    style={{
                                        fontSize: '0.625rem',
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: 'var(--radius-full)',
                                        border: isFollowingOwner ? '1px solid hsl(var(--border))' : 'none',
                                        background: isFollowingOwner ? 'transparent' : 'hsl(var(--primary))',
                                        color: isFollowingOwner ? 'hsl(var(--muted-foreground))' : 'white',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    {followLoading ? '...' : isFollowingOwner ? 'Following' : 'Follow'}
                                </button>
                            )}
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
                            {/* Imagine Me Button (Only for owner or generally available? Plan implies available to all) */}
                            {!outfit.imagine_on_avatar && user && (
                                <button
                                    onClick={handleImagineMeStart}
                                    disabled={tryOnLoading}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-full)',
                                        border: '1px solid hsl(var(--primary))',
                                        background: 'hsl(var(--primary))',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem', fontWeight: 600
                                    }}
                                >
                                    {tryOnLoading ? <Sparkle className="animate-spin" /> : <Sparkle weight="fill" />}
                                    Imagine Me
                                </button>
                            )}

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

                    {/* Imagine Me Result */}
                    {outfit.imagine_on_avatar && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={{ 
                                marginTop: '1rem', 
                                position: 'relative', 
                                borderRadius: 'var(--radius-lg)', 
                                overflow: 'hidden',
                                border: '1px solid hsl(var(--border))'
                            }}
                        >
                            <div style={{ 
                                position: 'absolute', top: '0.5rem', left: '0.5rem', 
                                background: 'rgba(0,0,0,0.6)', color: 'white', 
                                padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-full)',
                                fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem'
                            }}>
                                <Sparkle weight="fill" /> Virtual Try-On
                            </div>
                            <img 
                                src={outfit.imagine_on_avatar} 
                                alt="Virtual Try-On" 
                                style={{ width: '100%', display: 'block' }} 
                            />
                        </motion.div>
                    )}

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

            <MissingDataModal 
                isOpen={showMissingModal} 
                onClose={() => setShowMissingModal(false)}
                onUpdateProfile={() => window.location.href = '/profile'}
                onProceed={executeTryOn}
            />
        </div>
    )
}
