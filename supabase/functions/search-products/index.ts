// Supabase Edge Function: search-products

import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { query, filters, userPreferences } = await req.json()
        const productCondition = filters?.condition || 'ANY'
        const limit = filters?.limit || 10
        const country = filters?.country || 'us'
        const sortBy = filters?.sortBy || 'BEST_MATCH'

        // Extract user preference context for smarter search
        const gender = userPreferences?.gender || ''
        const styles = userPreferences?.preferredStyles || []
        const colors = userPreferences?.preferredColors || []
        const materials = userPreferences?.materials || []
        const fitType = userPreferences?.fitType || []

        // 1. OpenAI Agent: Generate optimized query using user preferences
        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        let optimizedQuery = query

        if (openAiKey) {
            const prefContext = [
                gender ? `Gender: ${gender}` : '',
                styles.length > 0 ? `Styles: ${styles.join(', ')}` : '',
                colors.length > 0 ? `Colors: ${colors.join(', ')}` : '',
                materials.length > 0 ? `Materials: ${materials.join(', ')}` : '',
                fitType.length > 0 ? `Fit: ${fitType.join(', ')}` : '',
            ].filter(Boolean).join('. ')

            const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openAiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a Commerce Search Agent. Convert a user's outfit item request into a specific, high-intent Google Shopping search query.
                        - Return ONLY the search query string. No quotes, no explanation.
                        - Use the user preferences context to make the query more specific.
                        - Include gender if provided (e.g. "men's", "women's").
                        - Include color and material if relevant.
                        - Keep it under 8 words for best results.
                        Example: User "white sneakers" + Gender: Men -> "men's white minimalist leather sneakers"`
                        },
                        { role: 'user', content: `Query: "${query}"\nUser Preferences: ${prefContext || 'none'}` }
                    ]
                })
            })
            const openAiData = await openAiRes.json()
            if (openAiData.choices?.[0]?.message?.content) {
                optimizedQuery = openAiData.choices[0].message.content.trim()
            }
        }

        // 2. Call RapidAPI (Real-Time Product Search)
        const rapidApiKey = Deno.env.get('RAPIDAPI_KEY')
        if (!rapidApiKey) {
            throw new Error('RAPIDAPI_KEY not configured')
        }

        const params = new URLSearchParams({
            q: optimizedQuery,
            country: country,
            language: 'en',
            page: '1',
            limit: limit.toString(),
            sort_by: sortBy,
            product_condition: productCondition,
            return_filters: 'true'
        })

        const rapidApiRes = await fetch(`https://real-time-product-search.p.rapidapi.com/search-v2?${params}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-key': rapidApiKey,
                'x-rapidapi-host': 'real-time-product-search.p.rapidapi.com'
            }
        })

        if (!rapidApiRes.ok) {
            const errorText = await rapidApiRes.text()
            console.error('RapidAPI Error:', errorText)
            throw new Error(`RapidAPI Error: ${rapidApiRes.status}`)
        }

        const data = await rapidApiRes.json()
        const products = data.data?.products || []

        // 3. Tag products with preference parameters using OpenAI
        const taggedProducts = products.map((p: any) => ({
            query: query,
            title: p.product_title || p.title || '',
            price: p.offer?.price || p.price || '',
            image_url: p.product_photos?.[0] || p.thumbnail || '',
            product_url: p.offer?.offer_page_url || p.product_page_url || p.link || '',
            source: 'rapidapi_google',
            brand: p.product_attributes?.Brand || 'Unknown',
            // Default empty — will be filled by OpenAI tagging
            gender: '',
            color: '',
            category: '',
            style: '',
            fit_type: '',
            sizes: [] as string[],
            material: ''
        }))

        if (openAiKey && taggedProducts.length > 0) {
            try {
                const productTitles = taggedProducts.map((p: any, i: number) =>
                    `${i}: "${p.title}" by ${p.brand}`
                ).join('\n')

                const tagRes = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openAiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: `You are a fashion product tagger. For each product, extract these attributes from its title/brand:
- gender: "Men", "Women", or "Unisex"
- color: primary color (e.g. "Black", "White", "Blue")
- category: "tops", "bottoms", "dresses", "outerwear", "shoes", "ethnic", "activewear", or "accessories"
- style: one of: Indie, Cottagecore, Y2K, Clean Girl, Old Money, Streetwear, Coquette, Grunge, Minimalist, Boho, Athleisure, Dark Academia, Light Academia, Coastal, Preppy, Baddie, Soft Girl, E-Girl, Ethnic/Traditional, Whimsical, Casual, Formal
- fit_type: "Slim", "Regular", "Relaxed", "Oversized", "Loose", or "Athletic"
- material: primary material (e.g. "Cotton", "Polyester", "Denim", "Leather", "Silk")

Return ONLY valid JSON array. Each element: {"i": index, "gender": "", "color": "", "category": "", "style": "", "fit_type": "", "material": ""}
If unsure for a field, use "".`
                            },
                            { role: 'user', content: productTitles }
                        ],
                        temperature: 0.1
                    })
                })

                const tagData = await tagRes.json()
                const tagContent = tagData.choices?.[0]?.message?.content || ''

                // Parse the JSON response
                const jsonMatch = tagContent.match(/\[[\s\S]*\]/)
                if (jsonMatch) {
                    const tags = JSON.parse(jsonMatch[0])
                    tags.forEach((tag: any) => {
                        const idx = tag.i
                        if (idx >= 0 && idx < taggedProducts.length) {
                            taggedProducts[idx].gender = tag.gender || ''
                            taggedProducts[idx].color = tag.color || ''
                            taggedProducts[idx].category = tag.category || ''
                            taggedProducts[idx].style = tag.style || ''
                            taggedProducts[idx].fit_type = tag.fit_type || ''
                            taggedProducts[idx].material = tag.material || ''
                        }
                    })
                }
            } catch (tagError) {
                console.error('Product tagging error:', tagError)
                // Continue with untagged products — not a fatal error
            }
        }

        // 4. Store Results in Supabase
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const productsToSave = taggedProducts.map((p: any) => ({
            query: p.query,
            title: p.title,
            price: p.price,
            image_url: p.image_url,
            product_url: p.product_url,
            source: p.source,
            brand: p.brand,
            gender: p.gender,
            color: p.color,
            category: p.category,
            style: p.style,
            fit_type: p.fit_type,
            sizes: p.sizes,
            material: p.material
        }))

        if (productsToSave.length > 0) {
            const { error: dbError } = await supabaseClient
                .from('discovered_items')
                .insert(productsToSave)

            if (dbError) console.error('DB Insert Error:', dbError)
        }

        return new Response(
            JSON.stringify({
                optimizedQuery,
                products: taggedProducts
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
