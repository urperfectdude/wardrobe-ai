// Supabase-only storage utilities
// No localStorage fallback - requires Supabase connection

import { supabase } from '../lib/supabase'

// ============================================
// HELPER: Manual Session & Fetch
// ============================================

// ============================================
// HELPER: Auth & Fetch
// ============================================

// Get session with timeout to prevent hanging
async function getAuthSession(timeoutMs = 5000) {
    // First try localStorage for immediate session (faster, non-blocking)
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        if (supabaseUrl) {
            const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
            const key = `sb-${projectRef}-auth-token`
            const stored = localStorage.getItem(key)
            if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed?.access_token && parsed?.user) {
                    // Check if token is not expired
                    const expiresAt = parsed.expires_at
                    if (!expiresAt || expiresAt * 1000 > Date.now()) {
                        return parsed
                    }
                }
            }
        }
    } catch (e) {
        // localStorage failed, continue to supabase client
    }

    // Fallback to supabase client with timeout
    if (!supabase) return null

    try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Session timeout')), timeoutMs)
        )

        const { data } = await Promise.race([sessionPromise, timeoutPromise])
        return data?.session || null
    } catch (e) {
        console.warn('Error getting session:', e)
        return null
    }
}

async function supabaseFetch(table, options = {}) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase not configured')

    let url = `${supabaseUrl}/rest/v1/${table}`
    const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

    // Add Auth token if signed in (skip for public endpoints)
    if (!options.skipAuth) {
        const session = await getAuthSession()
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`
        }
    }

    if (options.params) {
        const params = new URLSearchParams()
        Object.entries(options.params).forEach(([k, v]) => params.append(k, v))
        url += `?${params.toString()}`
    }

    if (options.query) {
        url += `?${options.query}`
    } else {
        url += `?select=*`
    }

    // Merge custom headers (for Prefer: resolution=merge-duplicates etc)
    if (options.headers) {
        Object.assign(headers, options.headers)
    }

    const fetchOptions = { headers }
    if (options.method) fetchOptions.method = options.method
    if (options.body) fetchOptions.body = JSON.stringify(options.body)

    const response = await fetch(url, fetchOptions)
    if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Fetch failed (${response.status}): ${errText}`)
    }
    // Handle 204 No Content (successful upsert with no body)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null
    }
    const text = await response.text()
    return text ? JSON.parse(text) : null
}

// ============================================
// WARDROBE ITEMS
// ============================================

export async function getWardrobeItems() {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user) return []

        // Use supabaseFetch specific for wardrobe items query
        // "user_id=eq.USERID&order=created_at.desc"
        const data = await supabaseFetch('wardrobe_items', {
            query: `user_id=eq.${user.id}&order=created_at.desc`
        })

        return data.map(item => ({
            id: item.id,
            image: item.image_url,
            title: item.title,
            description: item.description,
            ai_description: item.ai_description,
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

export async function getProducts(filters = {}) {
    try {
        const params = { select: '*' }

        // Build filters as URL params is tricky for mixed AND/OR logic, 
        // but basics work. Complex filters need PostgREST syntax.
        // We'll reimplement the URL construction logic here.

        let queryString = 'select=*'

        if (filters.platforms && filters.platforms.length > 0) {
            queryString += `&platform=in.(${filters.platforms.join(',')})`
        }
        if (filters.priceRange) {
            queryString += `&price=gte.${filters.priceRange[0]}&price=lte.${filters.priceRange[1]}`
        }
        if (filters.thriftFilter === 'new') {
            queryString += `&is_thrifted=eq.false`
        } else if (filters.thriftFilter === 'thrifted') {
            queryString += `&is_thrifted=eq.true`
        }
        if (filters.sortBy === 'price-low') {
            queryString += `&order=price.asc`
        } else if (filters.sortBy === 'price-high') {
            queryString += `&order=price.desc`
        } else if (filters.sortBy === 'rating') {
            queryString += `&order=rating.desc`
        }

        const data = await supabaseFetch('products', { query: queryString, skipAuth: true })

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
            color: p.color || '',
            style: p.style || '',
            styles: p.styles || [],
            gender: p.gender || '',
            fit_type: p.fit_type || '',
            sizes: p.sizes || [],
            material: p.material || '',
            isThrifted: p.is_thrifted
        }))

        // Client-side filtering
        if (filters.query) {
            const q = filters.query.toLowerCase()
            results = results.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.brand || '').toLowerCase().includes(q)
            )
        }
        if (filters.brands && filters.brands.length > 0) {
            results = results.filter(p => filters.brands.includes(p.brand))
        }
        if (filters.styles && filters.styles.length > 0) {
            results = results.filter(p => p.styles.some(s => filters.styles.includes(s)))
        }
        if (filters.colors && filters.colors.length > 0) {
            results = results.filter(p => filters.colors.includes(p.color))
        }
        if (filters.categories && filters.categories.length > 0) {
            results = results.filter(p => filters.categories.includes(p.category))
        }
        if (filters.materials && filters.materials.length > 0) {
            results = results.filter(p => {
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

export async function saveWardrobeItem(item) {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user) throw new Error('Not logged in')

        // Image upload still needs supabase client storage or manual fetch to storage API
        // Storage API is complex via fetch (binary body). 
        // We'll try Supabase client for storage first, if it works. 
        // Usually storage client doesn't hang like Auth does.

        let imageUrl = item.image
        if (item.image && item.image.startsWith('data:')) {
            imageUrl = await uploadImageToStorage(item.image)
        }

        const data = await supabaseFetch('wardrobe_items', {
            method: 'POST',
            body: {
                user_id: user.id, // Explicitly send user_id for RLS safety if policy allows or if token header handles it
                image_url: imageUrl,
                title: item.title || '',
                description: item.description || '',
                ai_description: item.ai_description || '',
                brand: item.brand || '',
                category: item.category || '',
                color: item.color || '',
                category1: item.category1 || '',
                category2: item.category2 || '',
                category3: item.category3 || '',
                category4: item.category4 || '',
                issue: item.issue || ''
            },
            headers: {
                'Prefer': 'return=representation'
            }
        })

        const newItem = Array.isArray(data) ? data[0] : data

        return {
            id: newItem.id,
            image: newItem.image_url,
            title: newItem.title,
            description: newItem.description,
            ai_description: newItem.ai_description,
            brand: newItem.brand,
            category: newItem.category,
            color: newItem.color,
            category1: newItem.category1,
            category2: newItem.category2,
            category3: newItem.category3,
            category4: newItem.category4,
            issue: newItem.issue,
            createdAt: newItem.created_at
        }
    } catch (error) {
        console.error('Error saving wardrobe item:', error)
        throw error // Rethrow original error to context (e.g. Upload failed)
    }
}

export async function deleteWardrobeItem(id) {
    try {
        const session = await getAuthSession()
        if (!session?.user) throw new Error('Not logged in')

        // Use supabaseFetch with method DELETE usually requires ID in URL
        // rest/v1/table?id=eq.ID
        await supabaseFetch('wardrobe_items', {
            method: 'DELETE',
            query: `id=eq.${id}`
        })
        return true
    } catch (error) {
        console.error('Error deleting wardrobe item:', error)
        throw new Error('Failed to delete item')
    }
}

// ============================================
// USER PREFERENCES (stored in user_profiles)
// ============================================

export async function savePreferences(prefs) {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user) {
            localStorage.setItem('wardrobe_preferences', JSON.stringify(prefs))
            return prefs
        }

        const dbPrefs = {
            user_id: user.id,
            thrift_preference: prefs.thriftPreference || 'both',
            sizes: prefs.sizes || [],
            preferred_colors: prefs.preferredColors || [],
            budget: prefs.budget || [500, 5000],
            fit_type: prefs.fitType || [],
            preferred_styles: prefs.preferredStyles || [],
            materials: prefs.materials || [],
            body_type: prefs.bodyType || '',
            gender: prefs.gender || '',
            updated_at: new Date().toISOString()
        }

        await supabaseFetch('user_profiles', {
            method: 'POST',
            headers: { 'Prefer': 'resolution=merge-duplicates' },
            body: dbPrefs,
            query: 'on_conflict=user_id'
        })

        return prefs
    } catch (error) {
        console.error('Error saving preferences:', error)
        localStorage.setItem('wardrobe_preferences', JSON.stringify(prefs))
        return prefs
    }
}

export async function getPreferences() {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user) {
            const saved = localStorage.getItem('wardrobe_preferences')
            return saved ? JSON.parse(saved) : getDefaultPreferences()
        }

        try {
            const data = await supabaseFetch('user_profiles', {
                query: `user_id=eq.${user.id}`,
                headers: { 'Accept': 'application/vnd.pgrst.object+json' }
            })

            const profile = Array.isArray(data) ? data[0] : data

            if (!profile) return getDefaultPreferences()

            return {
                thriftPreference: profile.thrift_preference || 'both',
                sizes: profile.sizes || [],
                preferredColors: profile.preferred_colors || [],
                budget: profile.budget || [500, 5000],
                fitType: profile.fit_type || [],
                preferredStyles: profile.preferred_styles || [],
                materials: profile.materials || [],
                bodyType: profile.body_type || '',
                gender: profile.gender || ''
            }
        } catch (e) {
            return getDefaultPreferences()
        }
    } catch (error) {
        console.error('Error loading preferences:', error)
        return getDefaultPreferences()
    }
}

function getDefaultPreferences() {
    return {
        thriftPreference: 'both',
        sizes: [],
        preferredColors: [],
        budget: [500, 5000],
        fitType: [],
        preferredStyles: [],
        materials: [],
        bodyType: '',
        gender: ''
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

export function compressImage(base64, maxDimension = 800) {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')

            // Calculate dimensions maintaining aspect ratio
            let width = img.width
            let height = img.height

            if (width > height && width > maxDimension) {
                height = (height / width) * maxDimension
                width = maxDimension
            } else if (height > maxDimension) {
                width = (width / height) * maxDimension
                height = maxDimension
            }

            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

            // Use WebP for better compression (50-70% smaller than JPEG)
            // Quality 0.7 gives good balance of quality vs size
            const webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp')
            if (webpSupported) {
                resolve(canvas.toDataURL('image/webp', 0.7))
            } else {
                // Fallback to JPEG for older browsers
                resolve(canvas.toDataURL('image/jpeg', 0.7))
            }
        }
        img.src = base64
    })
}

/**
 * Upload an image to Supabase Storage (closet-items bucket)
 * @param {string} base64Data - Base64 encoded image data
 * @returns {Promise<string>} - Public URL of uploaded image
 */
export async function uploadImageToStorage(base64Data) {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user || !user.id) throw new Error('Not logged in or missing user ID')

        // Determine content type and extension from base64
        const isWebP = base64Data.includes('data:image/webp')
        const contentType = isWebP ? 'image/webp' : 'image/jpeg'
        const extension = isWebP ? 'webp' : 'jpg'

        const fileName = `${user.id}/${Date.now()}.${extension}`
        const rawBase64 = base64Data.split(',')[1]

        // Convert base64 to Blob for upload (more reliable than ArrayBuffer for Supabase)
        const binaryString = atob(rawBase64)
        const len = binaryString.length
        const bytes = new Uint8Array(len)
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: contentType })

        console.log(`Uploading ${fileName} (${bytes.length} bytes) type: ${contentType} via REST API...`)

        // Construct URL for direct REST API
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const uploadUrl = `${supabaseUrl}/storage/v1/object/closet-items/${fileName}`

        console.log('Target URL:', uploadUrl)

        // Execute fetch directly to bypass SDK issues
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': contentType,
                'x-upsert': 'false'
            },
            body: bytes
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('REST Upload Failed:', response.status, errorText)
            throw new Error(`Upload failed (${response.status}): ${errorText}`)
        }

        const data = await response.json()

        // Construct public URL manually
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/closet-items/${fileName}`

        console.log('Upload successful via REST, URL:', publicUrl)
        return publicUrl
    } catch (error) {
        console.error('Error uploading to storage:', error)
        throw error // Propagate error to caller
    }
}

// ============================================
// SAVED OUTFITS
// ============================================

// Auto-save every generation to recent_outfits (source of truth)
export async function saveRecentOutfit(outfit, preferences = null) {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user) return null

        const data = await supabaseFetch('recent_outfits', {
            method: 'POST',
            body: {
                user_id: user.id,
                mood: outfit.mood,
                items: outfit.items,
                description: outfit.description || '',
                preferences: preferences,
                reason: outfit.reason || '',
                is_public: false
            }
        })
        return Array.isArray(data) ? data[0] : data
    } catch (error) {
        console.error('Error saving recent outfit:', error)
        throw new Error('Failed to save recent outfit')
    }
}

export async function saveOutfit(outfit, isSaved = false, isPublic = false) {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user) return null

        const data = await supabaseFetch('saved_outfits', {
            method: 'POST',
            body: {
                user_id: user.id,
                mood: outfit.mood,
                items: outfit.items,
                description: outfit.description || '',
                is_saved: isSaved,
                is_public: isPublic
            }
        })
        return Array.isArray(data) ? data[0] : data
    } catch (error) {
        console.error('Error saving outfit:', error)
        throw new Error('Failed to save outfit')
    }
}

export async function markOutfitAsSaved(outfitId, isPublic = false) {
    try {
        const data = await supabaseFetch('saved_outfits', {
            method: 'PATCH',
            query: `id=eq.${outfitId}`,
            body: { is_saved: true, is_public: isPublic, updated_at: new Date().toISOString() }
        })
        return Array.isArray(data) ? data[0] : data
    } catch (error) {
        console.error('Error marking outfit as saved:', error)
        throw new Error('Failed to update outfit')
    }
}

// Mark a recent outfit as saved (add FK reference to saved_outfits)
export async function saveRecentToSaved(recentOutfitId, isPublic = false) {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user) return null

        // Insert FK reference into saved_outfits
        const data = await supabaseFetch('saved_outfits', {
            method: 'POST',
            body: {
                user_id: user.id,
                recent_outfit_id: recentOutfitId
            }
        })

        // Update recent_outfits to mark as public if needed
        if (isPublic) {
            await supabaseFetch('recent_outfits', {
                method: 'PATCH',
                query: `id=eq.${recentOutfitId}`,
                body: { is_public: true, updated_at: new Date().toISOString() }
            })
        }

        return Array.isArray(data) ? data[0] : data
    } catch (error) {
        console.error('Error saving recent to saved:', error)
        throw new Error('Failed to save outfit')
    }
}

// Get recent outfits from recent_outfits table (generation history)
export async function getRecentOutfits() {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user) return []

        const data = await supabaseFetch('recent_outfits', {
            query: `user_id=eq.${user.id}&order=created_at.desc&limit=20`
        })
        return data || []
    } catch (error) {
        return []
    }
}

// Get saved outfits by fetching FKs from saved_outfits and joining with recent_outfits
export async function getSavedOutfits() {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user) return []

        // Get saved outfit FKs
        const savedRefs = await supabaseFetch('saved_outfits', {
            query: `user_id=eq.${user.id}&order=created_at.desc`
        })

        if (!savedRefs || savedRefs.length === 0) return []

        // Get the actual outfit data from recent_outfits
        const recentOutfitIds = savedRefs.map(s => s.recent_outfit_id)
        const outfits = await supabaseFetch('recent_outfits', {
            query: `id=in.(${recentOutfitIds.join(',')})&order=created_at.desc`
        })

        return outfits || []
    } catch (error) {
        console.error('Error getting saved outfits:', error)
        return []
    }
}

export async function getOutfitHistory() {
    return getRecentOutfits()
}

export async function getPublicOutfits(limit = 10, offset = 0) {
    try {
        // Query recent_outfits where is_public=true (source of truth for public outfits)
        const data = await supabaseFetch('recent_outfits', {
            query: `is_public=eq.true&order=created_at.desc&limit=${limit}&offset=${offset}`,
            skipAuth: true
        })
        return data || []
    } catch (error) {
        console.error('Error fetching public outfits:', error)
        return []
    }
}

export async function deleteOutfit(outfitId) {
    try {
        await supabaseFetch('saved_outfits', {
            method: 'DELETE',
            query: `id=eq.${outfitId}`
        })
        return true
    } catch (error) {
        throw new Error('Failed to delete outfit')
    }
}

// ============================================
// PURCHASE REQUESTS
// ============================================

export async function sendPurchaseRequest(itemId, sellerId, offerPrice, message = '') {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user) throw new Error('Must be logged in')

        const data = await supabaseFetch('purchase_requests', {
            method: 'POST',
            body: {
                item_id: itemId,
                seller_id: sellerId,
                buyer_id: user.id,
                offer_price: offerPrice,
                message: message
            }
        })
        return Array.isArray(data) ? data[0] : data
    } catch (error) {
        throw new Error('Failed to send offer')
    }
}

export async function getPurchaseRequests() {
    try {
        const session = await getAuthSession()
        const user = session?.user
        if (!user) return []

        // OR syntax: or=(seller_id.eq.UID,buyer_id.eq.UID)
        const data = await supabaseFetch('purchase_requests', {
            query: `or=(seller_id.eq.${user.id},buyer_id.eq.${user.id})&order=created_at.desc`
        })
        return data || []
    } catch (error) {
        return []
    }
}

export async function updatePurchaseRequest(requestId, status, qilinLink = null) {
    try {
        const updateData = { status, updated_at: new Date().toISOString() }
        if (qilinLink) updateData.qilin_link = qilinLink

        const data = await supabaseFetch('purchase_requests', {
            method: 'PATCH',
            body: updateData,
            query: `id=eq.${requestId}`
        })
        return Array.isArray(data) ? data[0] : data
    } catch (error) {
        throw new Error('Failed to update request')
    }
}
