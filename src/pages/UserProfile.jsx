import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, UserCircle, Users } from '@phosphor-icons/react'
import {
    getPublicProfile, getUserPublicOutfits,
    getFollowerCount, getFollowingCount,
    isFollowing, followUser, unfollowUser
} from '../utils/social'
import { useAuth } from '../contexts/AuthContext'

export default function UserProfile() {
    const { username } = useParams()
    const { user } = useAuth()
    const [profile, setProfile] = useState(null)
    const [outfits, setOutfits] = useState([])
    const [followers, setFollowers] = useState(0)
    const [following, setFollowing] = useState(0)
    const [isFollowingUser, setIsFollowingUser] = useState(false)
    const [loading, setLoading] = useState(true)
    const [followLoading, setFollowLoading] = useState(false)

    useEffect(() => {
        loadProfile()
    }, [username])

    async function loadProfile() {
        setLoading(true)
        try {
            const prof = await getPublicProfile(username)
            if (!prof) { setLoading(false); return }
            setProfile(prof)

            const [outfitRes, followerCount, followingCount, isFollow] = await Promise.all([
                getUserPublicOutfits(prof.user_id),
                getFollowerCount(prof.user_id),
                getFollowingCount(prof.user_id),
                user ? isFollowing(prof.user_id) : false
            ])
            setOutfits(outfitRes)
            setFollowers(followerCount)
            setFollowing(followingCount)
            setIsFollowingUser(isFollow)
        } catch (err) {
            console.error('Error loading profile:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleFollow = async () => {
        if (!user || !profile) return
        setFollowLoading(true)
        try {
            if (isFollowingUser) {
                await unfollowUser(profile.user_id)
                setIsFollowingUser(false)
                setFollowers(prev => prev - 1)
            } else {
                await followUser(profile.user_id)
                setIsFollowingUser(true)
                setFollowers(prev => prev + 1)
            }
        } catch (err) {
            console.error('Follow error:', err)
        } finally {
            setFollowLoading(false)
        }
    }

    const isOwnProfile = user?.id === profile?.user_id

    if (loading) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '3rem' }}>
                <p className="text-muted">Loading profile...</p>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="container" style={{ textAlign: 'center', paddingTop: '3rem' }}>
                <h2>User not found</h2>
                <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go Home</Link>
            </div>
        )
    }

    return (
        <div className="container" style={{ maxWidth: '600px' }}>
            {/* Back */}
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'hsl(var(--muted-foreground))', textDecoration: 'none', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                <ArrowLeft size={16} /> Back
            </Link>

            {/* Profile Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '1rem', marginBottom: '2rem'
                }}
            >
                {profile.selfie_url || profile.avatar_url ? (
                    <img
                        src={profile.selfie_url || profile.avatar_url}
                        alt={profile.name}
                        style={{
                            width: '90px', height: '90px', borderRadius: '50%',
                            objectFit: 'cover', border: '3px solid hsl(var(--primary) / 0.3)'
                        }}
                    />
                ) : (
                    <div style={{
                        width: '90px', height: '90px', borderRadius: '50%',
                        background: 'hsl(var(--muted))', display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                        <UserCircle size={48} style={{ color: 'hsl(var(--muted-foreground))' }} />
                    </div>
                )}

                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                        {profile.name || username}
                    </h1>
                    <p style={{ fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>
                        @{username}
                    </p>
                    {profile.bio && (
                        <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem', color: 'hsl(var(--foreground))' }}>
                            {profile.bio}
                        </p>
                    )}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{outfits.length}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>outfits</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{followers}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>followers</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>{following}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))' }}>following</div>
                    </div>
                </div>

                {/* Follow Button */}
                {user && !isOwnProfile && (
                    <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`btn btn-sm ${isFollowingUser ? 'btn-outline' : 'btn-primary'}`}
                        style={{ width: '140px' }}
                    >
                        {followLoading ? '...' : isFollowingUser ? 'Following' : 'Follow'}
                    </button>
                )}
            </motion.div>

            {/* Outfits Grid */}
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Public Outfits
            </h3>
            {outfits.length === 0 ? (
                <p className="text-muted text-sm" style={{ textAlign: 'center' }}>No public outfits yet</p>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '0.75rem'
                }}>
                    {outfits.map(outfit => {
                        const outfitData = outfit.recent_outfits || outfit
                        const items = outfitData.items || []
                        const firstImage = items[0]?.image

                        return (
                            <Link
                                key={outfit.id}
                                to={`/outfit/${outfitData.id}`}
                                style={{ textDecoration: 'none' }}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    style={{
                                        borderRadius: 'var(--radius-lg)',
                                        overflow: 'hidden',
                                        border: '1px solid hsl(var(--border))',
                                        background: 'hsl(var(--card))'
                                    }}
                                >
                                    {firstImage ? (
                                        <img
                                            src={firstImage}
                                            alt="Outfit"
                                            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '100%', aspectRatio: '1',
                                            background: 'hsl(var(--muted))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Heart size={24} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                        </div>
                                    )}
                                    <div style={{ padding: '0.5rem' }}>
                                        <span style={{
                                            fontSize: '0.6875rem', fontWeight: 600,
                                            textTransform: 'capitalize', color: 'hsl(var(--foreground))'
                                        }}>
                                            {outfitData.occasion || outfitData.mood || 'Outfit'}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                            <Heart size={10} style={{ color: 'hsl(var(--accent))' }} />
                                            <span style={{ fontSize: '0.625rem', color: 'hsl(var(--muted-foreground))' }}>
                                                {items.length} items
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
