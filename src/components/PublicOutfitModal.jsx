import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, ShareNetwork, Sparkle, User, UserPlus, Check, Globe, Lock } from '@phosphor-icons/react'
import { useAuth } from '../contexts/AuthContext'
import { isFollowing, followUser, unfollowUser, hasLikedOutfit, likeOutfit, unlikeOutfit, getLikeCount } from '../utils/social'
import { updateRecentOutfit } from '../utils/storage'
import { Link } from 'react-router-dom'

export default function PublicOutfitModal({ isOpen, onClose, outfit }) {
    const { user } = useAuth()
    const [liked, setLiked] = useState(false)
    const [likes, setLikes] = useState(0)
    const [following, setFollowing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isPublic, setIsPublic] = useState(outfit?.is_public || false)

    useEffect(() => {
        if (isOpen && outfit) {
            loadSocialState()
            setIsPublic(outfit.is_public || false)
        }
    }, [isOpen, outfit, user])

    const loadSocialState = async () => {
        // ... existing loadSocialState logic ...
        setLoading(true)
        try {
            const [likeCount, userLiked, userFollowing] = await Promise.all([
                getLikeCount(outfit.id),
                user ? hasLikedOutfit(outfit.id) : false,
                user && outfit.user_id ? isFollowing(outfit.user_id) : false
            ])
            setLikes(likeCount)
            setLiked(userLiked)
            setFollowing(userFollowing)
        } catch (error) {
            console.error('Error loading social state:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleTogglePublic = async () => {
        if (!user || user.id !== outfit.user_id) return
        
        const newValue = !isPublic
        setIsPublic(newValue) // Optimistic update
        
        try {
            await updateRecentOutfit(outfit.id, { is_public: newValue })
        } catch (error) {
            console.error('Failed to update public status:', error)
            setIsPublic(!newValue) // Revert on error
        }
    }
    
    // ... rest of the file ...

    const toggleLike = async () => {
        if (!user) return // Prompt login?
        try {
            if (liked) {
                await unlikeOutfit(outfit.id)
                setLikes(p => p - 1)
                setLiked(false)
            } else {
                await likeOutfit(outfit.id)
                setLikes(p => p + 1)
                setLiked(true)
            }
        } catch (error) {
            console.error('Like error', error)
        }
    }

    const toggleFollow = async () => {
        if (!user || user.id === outfit.user_id) return
        try {
            if (following) {
                await unfollowUser(outfit.user_id)
                setFollowing(false)
            } else {
                await followUser(outfit.user_id)
                setFollowing(true)
            }
        } catch (error) {
            console.error('Follow error', error)
        }
    }

    const handleShare = () => {
        const url = `${window.location.origin}/outfit/${outfit.id}`
        if (navigator.share) {
            navigator.share({
                title: 'Check out this outfit!',
                url: url
            })
        } else {
            navigator.clipboard.writeText(url)
            alert('Link copied to clipboard!')
        }
    }

    if (!isOpen || !outfit) return null

    const likedItems = outfit.items?.filter(item => item.liked) || []

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {/* Avatar */}
                            {outfit.user_profiles?.avatar_url || outfit.user_profiles?.selfie_url ? (
                                <img 
                                    src={outfit.user_profiles.selfie_url || outfit.user_profiles.avatar_url} 
                                    alt="Owner" 
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <User size={20} />
                                </div>
                            )}

                            <div>
                                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
                                    {outfit.mood || 'Styled'} Outfit
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                                        by {outfit.user_profiles?.name || 'User'}
                                    </p>
                                    {user && user.id !== outfit.user_id && (
                                        <button 
                                            onClick={toggleFollow}
                                            style={{
                                                background: 'transparent', border: 'none', padding: 0,
                                                fontSize: '0.75rem', fontWeight: 600,
                                                color: following ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {following ? 'Following' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {/* Owner Toggle Public */}
                            {user && user.id === outfit.user_id && (
                                <button
                                    onClick={handleTogglePublic}
                                    style={{
                                        height: '32px',
                                        padding: '0 0.75rem',
                                        borderRadius: 'var(--radius-full)',
                                        background: isPublic ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        cursor: 'pointer',
                                        color: isPublic ? 'white' : 'hsl(var(--muted-foreground))',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isPublic ? (
                                        <>
                                            <Globe size={14} weight="bold" />
                                            Public
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={14} weight="bold" />
                                            Private
                                        </>
                                    )}
                                </button>
                            )}

                            <button
                                onClick={handleShare}
                                style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: 'hsl(var(--secondary))', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: 'hsl(var(--foreground))'
                                }}
                            >
                                <ShareNetwork size={16} />
                            </button>
                             <button
                                onClick={onClose}
                                style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: 'hsl(var(--secondary))', border: 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: 'hsl(var(--foreground))'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
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

                    {/* Likes/Social Bar */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '1.5rem',
                        gap: '1rem'
                    }}>
                        <button
                            onClick={toggleLike}
                            style={{
                                flex: 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                padding: '0.75rem',
                                background: liked ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--secondary))',
                                color: liked ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                                borderRadius: 'var(--radius-lg)',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.875rem'
                            }}
                        >
                            <Heart size={18} weight={liked ? 'fill' : 'regular'} />
                            {likes} Likes
                        </button>

                        <div style={{
                            flex: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem',
                            background: 'hsl(var(--secondary) / 0.5)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid hsl(var(--border))'
                        }}>
                            <Sparkle size={16} style={{ color: 'hsl(var(--accent))' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                                {likedItems.length} items styled via AI
                            </span>
                        </div>
                    </div>

                    {/* Imagine Me Result - Prominent View */}
                    {outfit.imagine_on_avatar && (
                        <div style={{ 
                            marginBottom: '1.5rem',
                            width: '100%',
                            maxWidth: '320px',
                            margin: '0 auto 1.5rem',
                            aspectRatio: '3/4',
                            background: '#000',
                            borderRadius: 'var(--radius-xl)',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-lg)',
                            border: '1px solid hsl(var(--border))'
                        }}>
                            <img 
                                src={outfit.imagine_on_avatar} 
                                alt="Imagine Me Result" 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                            />
                        </div>
                    )}

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


