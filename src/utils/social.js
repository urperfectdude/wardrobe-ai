// Social features: Follow/Unfollow, Like/Unlike
import { supabase } from '../lib/supabase'
import { getAuthSession } from './authUtils'

// ─── FOLLOW / UNFOLLOW ───

// ─── FOLLOW / UNFOLLOW ───

export async function followUser(followingId) {
    try {
        const session = await getAuthSession()
        if (!session?.user) throw new Error('Not authenticated')
        const user = session.user

        const { data, error } = await supabase
            .from('follows')
            .insert({ follower_id: user.id, following_id: followingId })
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error following user:', error)
        throw error
    }
}

export async function unfollowUser(followingId) {
    try {
        const session = await getAuthSession()
        if (!session?.user) throw new Error('Not authenticated')
        const user = session.user

        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', followingId)

        if (error) throw error
    } catch (error) {
        console.error('Error unfollowing user:', error)
        throw error
    }
}

export async function isFollowing(followingId) {
    try {
        const session = await getAuthSession()
        if (!session?.user) return false
        const user = session.user

        const { data } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', followingId)
            .maybeSingle()

        return !!data
    } catch (error) {
        console.error('Error checking isFollowing:', error)
        return false
    }
}

export async function getFollowerCount(userId) {
    const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)

    return count || 0
}

export async function getFollowingCount(userId) {
    const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)

    return count || 0
}

// ─── LIKE / UNLIKE ───

export async function likeOutfit(outfitId) {
    try {
        const session = await getAuthSession()
        if (!session?.user) throw new Error('Not authenticated')
        const user = session.user

    const { data, error } = await supabase
            .from('outfit_likes')
            .insert({ user_id: user.id, outfit_id: outfitId })
            .select()
            .single()

        if (error) {
            console.error('Supabase like error:', error)
            throw error
        }
        return data
    } catch (error) {
        console.error('Error liking outfit:', error)
        throw error
    }
}

export async function unlikeOutfit(outfitId) {
    try {
        const session = await getAuthSession()
        if (!session?.user) throw new Error('Not authenticated')
        const user = session.user

        const { error } = await supabase
            .from('outfit_likes')
            .delete()
            .eq('user_id', user.id)
            .eq('outfit_id', outfitId)

        if (error) throw error
    } catch (error) {
        console.error('Error unliking outfit:', error)
        throw error
    }
}

export async function hasLikedOutfit(outfitId) {
    try {
        const session = await getAuthSession()
        if (!session?.user) return false
        const user = session.user

        const { data } = await supabase
            .from('outfit_likes')
            .select('id')
            .eq('user_id', user.id)
            .eq('outfit_id', outfitId)
            .maybeSingle()

        return !!data
    } catch (error) {
        console.error('Error checking hasLikedOutfit:', error)
        return false
    }
}

export async function getLikeCount(outfitId) {
    const { count } = await supabase
        .from('outfit_likes')
        .select('*', { count: 'exact', head: true })
        .eq('outfit_id', outfitId)

    return count || 0
}

// ─── PUBLIC PROFILE ───

export async function getPublicProfile(username) {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('username', username)
        .single()

    if (error) return null
    return data
}

export async function getPublicProfileById(userId) {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error) return null
    return data
}

export async function getUserPublicOutfits(userId, limit = 20) {
    const { data, error } = await supabase
        .from('saved_outfits')
        .select('*, recent_outfits(*)')
        .eq('user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) return []
    return data
}

export async function getOutfitById(outfitId) {
    const { data, error } = await supabase
        .from('recent_outfits')
        .select('*')
        .eq('id', outfitId)
        .single()

    if (error) return null
    return data
}

export async function getLikedOutfits(limit = 20) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return []

    const { data, error } = await supabase
        .from('outfit_likes')
        .select('*, recent_outfits(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching liked outfits:', error)
        return []
    }

    // Transform to match outfit structure
    return data.map(like => like.recent_outfits).filter(Boolean)
}
