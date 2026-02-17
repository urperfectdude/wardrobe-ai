import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, ShareNetwork, ArrowCounterClockwise } from '@phosphor-icons/react'
import { useAuth } from '../contexts/AuthContext'
import { getLikeCount, hasLikedOutfit, likeOutfit, unlikeOutfit, isFollowing, followUser, unfollowUser } from '../utils/social'

export default function PublicOutfitCard({ outfit, onClick, onMoodSelect }) {
    const { user } = useAuth()
    const [liked, setLiked] = useState(false)
    const [likes, setLikes] = useState(0)
    const [likeLoading, setLikeLoading] = useState(false)
    const [isFollowingOwner, setIsFollowingOwner] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)

    // Handle potential array return from Supabase join
    const owner = Array.isArray(outfit.user_profiles) ? outfit.user_profiles[0] : outfit.user_profiles

    useEffect(() => {
        loadSocialState()
    }, [outfit.id, user])

    const loadSocialState = async () => {
        try {
            const [count, userLiked] = await Promise.all([
                getLikeCount(outfit.id),
                user ? hasLikedOutfit(outfit.id) : false
            ])
            setLikes(count)
            setLiked(userLiked)

            if (user && owner && user.id !== owner.user_id) {
                const following = await isFollowing(owner.user_id)
                setIsFollowingOwner(following)
            }
        } catch (error) {
            console.error('Error loading card social state:', error)
        }
    }

    const handleFollow = async (e) => {
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
        } catch (error) {
            console.error('Follow action failed:', error)
        } finally {
            setFollowLoading(false)
        }
    }

    const handleLike = async (e) => {
        e.stopPropagation()
        console.log('Follow/Like: Clicked')
        if (!user) {
            console.log('Follow/Like: No user logged in')
            return 
        }
        if (likeLoading) {
            console.log('Follow/Like: Already loading')
            return
        }

        setLikeLoading(true)
        try {
            if (liked) {
                console.log('Follow/Like: Unliking outfit', outfit.id)
                await unlikeOutfit(outfit.id)
                setLikes(p => Math.max(0, p - 1))
                setLiked(false)
            } else {
                console.log('Follow/Like: Liking outfit', outfit.id)
                await likeOutfit(outfit.id)
                setLikes(p => p + 1)
                setLiked(true)
            }
        } catch (error) {
            console.error('Like action failed:', error)
            alert(`Like failed: ${error.message}`)
        } finally {
            setLikeLoading(false)
        }
    }

    const handleShare = (e) => {
        e.stopPropagation()
        const url = `${window.location.origin}/outfit/${outfit.id}`
        if (navigator.share) {
            navigator.share({ title: 'Check out this outfit!', url })
        } else {
            navigator.clipboard.writeText(url)
            alert('Link copied!')
        }
    }



    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={onClick}
            style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius-xl)',
                padding: '1rem',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                marginBottom: '1rem',
                position: 'relative',
                overflow: 'hidden'
            }}
            whileHover={{ scale: 1.01, boxShadow: 'var(--shadow-md)' }}
        >
            {/* Header: Owner + Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                {/* Owner info */}
                {owner ? (
                    <div
                        onClick={(e) => { e.stopPropagation(); if (owner.username) window.location.href = `/user/${owner.username}` }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: owner.username ? 'pointer' : 'default' }}
                    >
                        {(owner.selfie_url || owner.avatar_url) ? (
                            <img src={owner.selfie_url || owner.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'hsl(var(--muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
                                {(owner.name || '?')[0].toUpperCase()}
                            </div>
                        )}
                        <div>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'block', lineHeight: 1.2 }}>{owner.name || 'Stylist'}</span>
                            {owner.username && <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>@{owner.username}</span>}
                        </div>
                        {user && owner && user.id !== owner.user_id && (
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                style={{
                                    fontSize: '0.625rem',
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: 'var(--radius-full)',
                                    border: isFollowingOwner ? '1px solid hsl(var(--border))' : 'none',
                                    background: isFollowingOwner ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
                                    color: isFollowingOwner ? 'hsl(var(--muted-foreground))' : 'white',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    marginLeft: '0.25rem'
                                }}
                            >
                                {followLoading ? '...' : isFollowingOwner ? 'Unfollow' : 'Follow'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ height: '32px' }} /> // spacer
                )}

                {/* Like/Share Actions */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                     <button
                        onClick={(e) => { e.stopPropagation(); onMoodSelect(outfit.mood); }}
                        style={{
                            padding: '0.25rem',
                            borderRadius: '50%',
                            border: 'none',
                            background: 'transparent',
                            color: 'hsl(var(--muted-foreground))',
                            cursor: 'pointer'
                        }}
                        title="Try this outfit"
                    >
                        <ArrowCounterClockwise size={18} />
                    </button>
                    <button
                        onClick={handleShare}
                        style={{
                            padding: '0.25rem',
                            borderRadius: '50%',
                            border: 'none',
                            background: 'transparent',
                            color: 'hsl(var(--muted-foreground))',
                            cursor: 'pointer'
                        }}
                    >
                        <ShareNetwork size={18} />
                    </button>
                    <button
                        onClick={handleLike}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            border: 'none',
                            background: 'transparent',
                            color: liked ? '#ef4444' : 'hsl(var(--muted-foreground))',
                            cursor: 'pointer',
                            fontSize: '0.75rem', fontWeight: 600
                        }}
                    >
                        <Heart size={18} weight={liked ? 'fill' : 'regular'} color={liked ? '#ef4444' : 'currentColor'} />
                        {likes > 0 && likes}
                    </button>
                </div>
            </div>

            {/* Content: Items Strip or Imagine Image */}
            <div style={{ position: 'relative', height: '220px' }}>
                {outfit.imagine_on_avatar ? (
                     <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        borderRadius: 'var(--radius-lg)', 
                        overflow: 'hidden',
                        border: '1px solid hsl(var(--border))',
                        background: '#000'
                     }}>
                        <img 
                            src={outfit.imagine_on_avatar} 
                            alt="Imagine Me Result" 
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                        />
                        {/* Overlay small items */}
                        <div style={{
                            position: 'absolute',
                            bottom: '0.5rem',
                            right: '0.5rem',
                            display: 'flex',
                            gap: '0.25rem'
                        }}>
                             {outfit.items?.slice(0, 3).map((item, i) => (
                                <div key={i} style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    border: '1px solid white',
                                    background: 'white'
                                }}>
                                    <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                             ))}
                        </div>
                     </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        overflowX: 'auto',
                        height: '100%',
                        scrollbarWidth: 'none',
                        paddingRight: '1rem'
                    }}>
                        {outfit.items?.map((item, i) => (
                            <div key={i} style={{
                                position: 'relative',
                                height: '100%',
                                aspectRatio: '1/1',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden',
                                border: '1px solid hsl(var(--border))',
                                flexShrink: 0,
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
                )}
            </div>
        </motion.div>
    )
}
