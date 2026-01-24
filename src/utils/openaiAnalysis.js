// OpenAI Image Analysis for Clothing
// Uses GPT-4o-mini with vision for clothing analysis

// Existing reference lists for matching - these are sent to AI for structured output
export const EXISTING_COLORS = [
    "Black", "White", "Gray", "Navy", "Blue", "Red", "Pink", "Green",
    "Yellow", "Orange", "Purple", "Beige", "Brown", "Cream", "Maroon",
    "Olive", "Teal", "Coral", "Burgundy", "Gold", "Silver", "Multi"
]

export const EXISTING_BRANDS = [
    "Nike", "Adidas", "Zara", "H&M", "Uniqlo", "Levi's", "Gap", "Mango",
    "Forever 21", "Shein", "FabIndia", "W", "Biba", "Global Desi", "AND",
    "Westside", "Lifestyle", "Max", "Pantaloons", "Van Heusen", "Allen Solly",
    "Peter England", "Raymond", "Louis Philippe", "Arrow", "US Polo",
    "Tommy Hilfiger", "Calvin Klein", "Puma", "Reebok", "New Balance",
    "Converse", "Vans", "Gucci", "Louis Vuitton", "Prada", "Other", "Unknown"
]

export const EXISTING_CATEGORY1 = [
    "Men", "Women", "Unisex", "Kids", "Boys", "Girls"
]

export const EXISTING_CATEGORY2 = [
    "Clothing", "Footwear", "Accessories", "Bags", "Jewelry", "Watches"
]

export const EXISTING_CATEGORY3 = [
    "Top", "Bottom", "Dress", "Outerwear", "Activewear", "Ethnic",
    "Sleepwear", "Innerwear", "Sneakers", "Heels", "Flats", "Boots", "Sandals"
]

// Category 4 is the Gen-Z style/aesthetic
export const EXISTING_CATEGORY4 = [
    "Indie", "Cottagecore", "Y2K", "Clean Girl", "Old Money", "Streetwear",
    "Coquette", "Grunge", "Minimalist", "Boho", "Athleisure", "Dark Academia",
    "Light Academia", "Coastal", "Preppy", "Baddie", "Soft Girl", "E-Girl",
    "Ethnic/Traditional", "Whimsical", "Office Siren", "Casual", "Formal", "Party"
]

// Main analysis function using Chat Completions API with vision
export async function analyzeClothingImage(imageBase64) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY

    if (!apiKey) {
        console.warn('OpenAI API key not configured')
        return getFallbackAnalysis()
    }

    try {
        // Build the system prompt with all category references
        const systemPrompt = `You are an expert fashion analyst AI for a wardrobe app. Analyze the clothing/accessory item in the image and extract structured information.

## AVAILABLE OPTIONS (you MUST pick from these lists):

### COLORS (pick the closest match):
${EXISTING_COLORS.join(', ')}

### BRANDS (pick the closest match or "Unknown" if not identifiable):
${EXISTING_BRANDS.join(', ')}

### CATEGORY 1 - Target Audience:
${EXISTING_CATEGORY1.join(', ')}

### CATEGORY 2 - Item Type:
${EXISTING_CATEGORY2.join(', ')}

### CATEGORY 3 - Apparel Type:
${EXISTING_CATEGORY3.join(', ')}

### CATEGORY 4 - Style/Aesthetic (Gen-Z fashion styles):
${EXISTING_CATEGORY4.join(', ')}

## IMAGE QUALITY ISSUES TO CHECK:
- Image is not upright (needs rotation)
- Item is partially cropped/cut off
- Item is worn by a human (prefer flat-lay or mannequin shots)
- Item is covered/obstructed by other objects
- Image is a collage (multiple images combined)
- Background is cluttered or too busy
- Image is blurry or low quality
- Multiple items visible (should be single item)

## YOUR RESPONSE FORMAT:
Respond with ONLY these lines in this exact format (no extra text):

title: [A short catchy title for this item, max 5 words]
description: [A brief 1-sentence description of the item]
brand: [Brand name from the list, or Unknown]
color: [Primary color from the list]
category1: [Target audience from list]
category2: [Item type from list]
category3: [Apparel type from list]
category4: [Style/aesthetic from list]
issue: [Any detected quality issue, or "None" if image is good]

IMPORTANT: Only use values from the provided lists. Be accurate and helpful.`

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: 'Analyze this clothing/fashion item and extract the attributes.' },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageBase64.startsWith('data:')
                                        ? imageBase64
                                        : `data:image/jpeg;base64,${imageBase64}`,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.2
            })
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('OpenAI API error:', response.status, errorData)
            throw new Error(`API error: ${response.status}`)
        }

        const data = await response.json()
        const content = data.choices[0]?.message?.content || ''
        console.log('AI Response:', content) // Debug log

        return parseTextResponse(content)

    } catch (error) {
        console.error('OpenAI analysis failed:', error)
        return getFallbackAnalysis()
    }
}

// Parse the text response from AI
function parseTextResponse(content) {
    const lines = content.split('\n')
    const result = {
        title: '',
        description: '',
        brand: '',
        color: '',
        category1: '',
        category2: '',
        category3: '',
        category4: '',
        issue: ''
    }

    for (const line of lines) {
        const colonIndex = line.indexOf(':')
        if (colonIndex === -1) continue

        const key = line.substring(0, colonIndex).trim().toLowerCase()
        const value = line.substring(colonIndex + 1).trim()

        switch (key) {
            case 'title': result.title = value; break
            case 'description': result.description = value; break
            case 'brand': result.brand = value; break
            case 'color': result.color = validateOption(value, EXISTING_COLORS); break
            case 'category1': result.category1 = validateOption(value, EXISTING_CATEGORY1); break
            case 'category2': result.category2 = validateOption(value, EXISTING_CATEGORY2); break
            case 'category3': result.category3 = validateOption(value, EXISTING_CATEGORY3); break
            case 'category4': result.category4 = validateOption(value, EXISTING_CATEGORY4); break
            case 'issue': result.issue = value; break
        }
    }

    return result
}

// Validate that the value is in the allowed options, find closest match if not
function validateOption(value, options) {
    if (!value) return ''

    // Direct match
    const directMatch = options.find(opt => opt.toLowerCase() === value.toLowerCase())
    if (directMatch) return directMatch

    // Partial match
    const partialMatch = options.find(opt =>
        opt.toLowerCase().includes(value.toLowerCase()) ||
        value.toLowerCase().includes(opt.toLowerCase())
    )
    if (partialMatch) return partialMatch

    // Return the original value if no match (will be displayed but user can correct)
    return value
}

// Fallback when AI is not available
function getFallbackAnalysis() {
    return {
        title: '',
        description: '',
        brand: '',
        color: '',
        category1: '',
        category2: '',
        category3: '',
        category4: '',
        issue: ''
    }
}
