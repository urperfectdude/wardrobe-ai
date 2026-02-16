// AI Gap Analysis — identifies missing wardrobe items for complete outfits
// Uses Gemini to analyze wardrobe and suggest missing pieces

import { createGeminiCompletion, isGeminiConfigured } from '../lib/gemini'
import { supabase } from '../lib/supabase'

/**
 * Analyze a user's wardrobe items + outfit and identify missing pieces.
 * Returns array of { term, description, searchUrl }
 */
export async function analyzeGaps(wardrobeItems, outfitItems, mood) {
    if (!isGeminiConfigured()) return []

    try {
        const wardrobeSummary = wardrobeItems
            .map(i => `${i.title || i.name} (${i.color}, ${i.category3 || i.category})`)
            .join(', ')

        const outfitSummary = outfitItems
            .map(i => `${i.title || i.name} (${i.color}, ${i.category3 || i.category})`)
            .join(', ')

        const content = await createGeminiCompletion({
            systemPrompt: `You are a fashion wardrobe analyst. Given a user's wardrobe and a generated outfit, identify 1-3 items that:
1. Would complete or elevate this specific outfit
2. Are NOT already in the user's wardrobe
3. Are practical, affordable fashion staples

Return ONLY a JSON array like:
[{"term": "white sneakers", "description": "A clean pair of white sneakers would complete this casual look"}, ...]

Rules:
- Keep terms short and searchable (2-4 words)
- If the outfit is already complete, return an empty array []
- Never suggest an item the user already has
- Focus on accessories, shoes, or layers that would add to the outfit`,
            userPrompt: `Mood: ${mood}
Current outfit: ${outfitSummary}
Full wardrobe: ${wardrobeSummary}

What items are missing to perfect this outfit?`,
            maxTokens: 300,
            temperature: 0.4
        })

        const cleaned = content.replace(/```json\n?|```\n?/g, '').trim()
        const parsed = JSON.parse(cleaned)
        
        if (!Array.isArray(parsed)) return []

        // Add search URLs
        return parsed.map(item => ({
            ...item,
            searchUrl: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.term)}`
        }))
    } catch (err) {
        console.error('Gap analysis failed:', err)
        return []
    }
}

/**
 * Cache missing items to avoid repeated AI calls.
 * Stores in the missing_items table.
 */
export async function cacheMissingItem(term, imageUrl = null) {
    try {
        const { data, error } = await supabase
            .from('missing_items')
            .upsert({
                term: term.toLowerCase(),
                image_url: imageUrl,
                search_url: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(term)}`
            }, { onConflict: 'term' })
            .select()
            .single()

        return data
    } catch (err) {
        console.error('Error caching missing item:', err)
        return null
    }
}

/**
 * Get cached missing items by terms
 */
export async function getCachedMissingItems(terms) {
    if (!terms?.length) return []

    try {
        const { data, error } = await supabase
            .from('missing_items')
            .select('*')
            .in('term', terms.map(t => t.toLowerCase()))

        return data || []
    } catch (err) {
        console.error('Error fetching cached items:', err)
        return []
    }
}
