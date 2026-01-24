// Supabase-only storage utilities
// No localStorage fallback - requires Supabase connection

import { supabase } from '../lib/supabase'

// ============================================
// WARDROBE ITEMS
// ============================================

export async function getWardrobeItems() {
    try {
        if (!supabase) return []
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data, error } = await supabase
            .from('wardrobe_items')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return data.map(item => ({
            id: item.id,
            image: item.image_url,
            title: item.title,
            description: item.description,
            brand: item.brand,
            category: item.category,
            color: item.color,
            category1: item.category1,
            category2: item.category2,
            category3: item.category3,
            category4: item.category4,
            issue: item.issue,
            createdAt: item.created_at
        }))
    } catch (error) {
        console.error('Error fetching wardrobe items:', error)
        throw new Error('Failed to load wardrobe items')
    }
}

export async function saveWardrobeItem(item) {
    try {
        // Upload image to Supabase Storage if it's a base64 string
        let imageUrl = item.image
        if (item.image && item.image.startsWith('data:')) {
            const fileName = `uploads/${Date.now()}.jpg`
            const base64Data = item.image.split(',')[1]

            const { error: uploadError } = await supabase.storage
                .from('wardrobe-images')
                .upload(fileName, decode(base64Data), {
                    contentType: 'image/jpeg'
                })

            if (uploadError) {
                console.error('Image upload error:', uploadError)
                // Use base64 as fallback if storage upload fails
                imageUrl = item.image
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from('wardrobe-images')
                    .getPublicUrl(fileName)
                imageUrl = publicUrl
            }
        }

        const { data, error } = await supabase
            .from('wardrobe_items')
            .insert({
                image_url: imageUrl,
                title: item.title || '',
                description: item.description || '',
                brand: item.brand || '',
                category: item.category || '',
                color: item.color || '',
                category1: item.category1 || '',
                category2: item.category2 || '',
                category3: item.category3 || '',
                category4: item.category4 || '',
                issue: item.issue || ''
            })
            .select()
            .single()

        if (error) throw error

        return {
            id: data.id,
            image: data.image_url,
            title: data.title,
            description: data.description,
            brand: data.brand,
            category: data.category,
            color: data.color,
            category1: data.category1,
            category2: data.category2,
            category3: data.category3,
            category4: data.category4,
            issue: data.issue,
            createdAt: data.created_at
        }
    } catch (error) {
        console.error('Error saving wardrobe item:', error)
        throw new Error('Failed to save item')
    }
}

export async function deleteWardrobeItem(id) {
    try {
        const { error } = await supabase
            .from('wardrobe_items')
            .delete()
            .eq('id', id)

        if (error) throw error
        return true
    } catch (error) {
        console.error('Error deleting wardrobe item:', error)
        throw new Error('Failed to delete item')
    }
}

// ============================================
// PRODUCTS (from Supabase)
// ============================================

export async function getProducts(filters = {}) {
    try {
        if (!supabase) return []
        let query = supabase.from('products').select('*')

        if (filters.platforms && filters.platforms.length > 0) {
            query = query.in('platform', filters.platforms)
        }

        if (filters.priceRange) {
            query = query.gte('price', filters.priceRange[0]).lte('price', filters.priceRange[1])
        }

        // Apply Thrift Filter
        if (filters.thriftFilter === 'new') {
            query = query.eq('is_thrifted', false)
        } else if (filters.thriftFilter === 'thrifted') {
            query = query.eq('is_thrifted', true)
        }
        // If 'both', we don't apply any filter

        if (filters.sortBy === 'price-low') {
            query = query.order('price', { ascending: true })
        } else if (filters.sortBy === 'price-high') {
            query = query.order('price', { ascending: false })
        } else if (filters.sortBy === 'rating') {
            query = query.order('rating', { ascending: false })
        }

        const { data, error } = await query

        if (error) throw error

        let results = data.map(p => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            price: p.price,
            originalPrice: p.original_price,
            rating: p.rating,
            reviews: p.reviews,
            platform: p.platform,
            image: p.image_url,
            image_url: p.image_url,
            product_url: p.product_url,
            category: p.category,
            color: p.color,
            style: p.style,
            styles: p.styles || [],
            isThrifted: p.is_thrifted
        }))

        // Apply text search client-side
        if (filters.query) {
            const q = filters.query.toLowerCase()
            results = results.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.brand || '').toLowerCase().includes(q)
            )
        }

        // Apply style filter client-side
        if (filters.styles && filters.styles.length > 0) {
            results = results.filter(p =>
                p.styles.some(s => filters.styles.includes(s))
            )
        }

        // Apply new filters: Brand, Color, Category, Material
        if (filters.brands && filters.brands.length > 0) {
            results = results.filter(p => filters.brands.includes(p.brand))
        }

        if (filters.colors && filters.colors.length > 0) {
            results = results.filter(p => filters.colors.includes(p.color))
        }

        if (filters.categories && filters.categories.length > 0) {
            results = results.filter(p => filters.categories.includes(p.category))
        }

        if (filters.materials && filters.materials.length > 0) {
            results = results.filter(p => {
                // Search in name or description (if available) since we don't have a material column
                const text = (p.name + ' ' + (p.description || '')).toLowerCase()
                return filters.materials.some(m => text.includes(m.toLowerCase()))
            })
        }

        return results
    } catch (error) {
        console.error('Error fetching products:', error)
        throw new Error('Failed to load products')
    }
}

// ============================================
// USER PREFERENCES
// ============================================

export async function savePreferences(prefs) {
    try {
        // For demo, save to localStorage since we don't have auth
        localStorage.setItem('wardrobe_preferences', JSON.stringify(prefs))
        return prefs
    } catch (error) {
        console.error('Error saving preferences:', error)
        throw new Error('Failed to save preferences')
    }
}

export async function getPreferences() {
    try {
        // For demo, read from localStorage
        const saved = localStorage.getItem('wardrobe_preferences')
        if (saved) {
            return JSON.parse(saved)
        }
        return {
            favoriteStyles: [],
            favoriteColors: [],
            bodyType: '',
            preferredOccasions: []
        }
    } catch (error) {
        console.error('Error loading preferences:', error)
        return null
    }
}

// ============================================
// IMAGE UTILITIES
// ============================================

function decode(base64) {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes
}

export function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export function compressImage(base64, maxWidth = 400) {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            const ratio = maxWidth / img.width
            canvas.width = maxWidth
            canvas.height = img.height * ratio
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.src = base64
    })
}

// ============================================
// SAVED OUTFITS
// ============================================

export async function saveOutfit(outfit, isSaved = false, isPublic = false) {
    try {
        if (!supabase) return null
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            // Allow saving loosely for guests in local state if needed (not implemented here) or return fake
            return null
        }

        const { data, error } = await supabase
            .from('saved_outfits')
            .insert({
                user_id: user.id,
                mood: outfit.mood,
                items: outfit.items,
                description: outfit.description || '',
                is_saved: isSaved,
                is_public: isPublic
            })
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error saving outfit:', error)
        throw new Error('Failed to save outfit')
    }
}

export async function markOutfitAsSaved(outfitId, isPublic = false) {
    try {
        const { data, error } = await supabase
            .from('saved_outfits')
            .update({ is_saved: true, is_public: isPublic, updated_at: new Date().toISOString() })
            .eq('id', outfitId)
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error marking outfit as saved:', error)
        throw new Error('Failed to update outfit')
    }
}

// Fetch only generated history (not explicitly saved/favorited)
export async function getRecentOutfits() {
    try {
        if (!supabase) return []
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data, error } = await supabase
            .from('saved_outfits')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_saved', false) // Only fetch history log
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching recent outfits:', error)
        return []
    }
}

// Fetch explicitly saved/favorited outfits
export async function getSavedOutfits() {
    try {
        if (!supabase) return []
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data, error } = await supabase
            .from('saved_outfits')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_saved', true)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching saved outfits:', error)
        return []
    }
}

// Deprecated in favor of getSavedOutfits/getRecentOutfits separation, but kept for compatibility if needed
export async function getOutfitHistory() {
    return getRecentOutfits()
}

export async function getPublicOutfits(limit = 10) {
    try {
        const { data, error } = await supabase
            .from('saved_outfits')
            .select(`
                *,
                user_profiles (username, avatar_url, name)
            `)
            .eq('is_public', true)
            .eq('is_saved', true) // Should likely be saved to be public? Or just public is enough. User said "public marked". Usually implies saved+public.
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching public outfits:', error)
        return []
    }
}

export async function deleteOutfit(outfitId) {
    try {
        const { error } = await supabase
            .from('saved_outfits')
            .delete()
            .eq('id', outfitId)

        if (error) throw error
        return true
    } catch (error) {
        console.error('Error deleting outfit:', error)
        throw new Error('Failed to delete outfit')
    }
}

// ============================================
// PURCHASE REQUESTS
// ============================================

export async function sendPurchaseRequest(itemId, sellerId, offerPrice, message = '') {
    try {
        if (!supabase) throw new Error('Service not configured')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Must be logged in to make offers')

        const { data, error } = await supabase
            .from('purchase_requests')
            .insert({
                item_id: itemId,
                seller_id: sellerId,
                buyer_id: user.id,
                offer_price: offerPrice,
                message: message
            })
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error sending purchase request:', error)
        throw new Error('Failed to send offer')
    }
}

export async function getPurchaseRequests() {
    try {
        if (!supabase) return []
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data, error } = await supabase
            .from('purchase_requests')
            .select('*')
            .or(`seller_id.eq.${user.id},buyer_id.eq.${user.id}`)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    } catch (error) {
        console.error('Error fetching purchase requests:', error)
        return []
    }
}

export async function updatePurchaseRequest(requestId, status, qilinLink = null) {
    try {
        const updateData = { status, updated_at: new Date().toISOString() }
        if (qilinLink) updateData.qilin_link = qilinLink

        const { data, error } = await supabase
            .from('purchase_requests')
            .update(updateData)
            .eq('id', requestId)
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error updating purchase request:', error)
        throw new Error('Failed to update request')
    }
}
