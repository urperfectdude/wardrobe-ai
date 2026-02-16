// Social features: Follow/Unfollow, Like/Unlike
import { supabase } from '../lib/supabase'

// ─── FOLLOW / UNFOLLOW ───

export async function followUser(followingId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: followingId })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function unfollowUser(followingId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', followingId)

    if (error) throw error
}

export async function isFollowing(followingId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', followingId)
        .maybeSingle()

    return !!data
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
        .from('outfit_likes')
        .insert({ user_id: user.id, outfit_id: outfitId })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function unlikeOutfit(outfitId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
        .from('outfit_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('outfit_id', outfitId)

    if (error) throw error
}

export async function hasLikedOutfit(outfitId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabase
        .from('outfit_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('outfit_id', outfitId)
        .maybeSingle()

    return !!data
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
