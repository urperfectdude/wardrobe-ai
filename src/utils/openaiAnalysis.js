// AI Image Analysis for Clothing
// Uses Google Gemini Flash with vision for clothing analysis

import { createGeminiVisionCompletion, createGeminiCompletion, isGeminiConfigured } from '../lib/gemini'
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

// NEW Hierarchy: Use this for UI and validation
export const CATEGORY_HIERARCHY = {
    'Top': ['T-Shirt', 'Shirt', 'Blouse', 'Crop Top', 'Tank Top', 'Sweater', 'Hoodie', 'Sweatshirt', 'Cardigan', 'Vest', 'Polo', 'Bodysuit'],
    'Bottom': ['Jeans', 'Trousers', 'Pants', 'Leggings', 'Joggers', 'Shorts', 'Skirt', 'Skort', 'Cargo Pants', 'Track Pants'],
    'Full Body': ['Dress', 'Jumpsuit', 'Romper', 'Suit', 'Coords', 'Saree', 'Kurta Set', 'Gown'],
    'Outerwear': ['Jacket', 'Coat', 'Blazer', 'Windbreaker', 'Puffer', 'Trench Coat', 'Bomber', 'Denim Jacket', 'Leather Jacket'],
    'Footwear': ['Sneakers', 'Boots', 'Heels', 'Flats', 'Sandals', 'Loafers', 'Oxfords', 'Slippers', 'Flip Flops', 'Formal Shoes'],
    'Accessories': ['Bag', 'Watch', 'Jewelry', 'Belt', 'Hat', 'Cap', 'Scarf', 'Sunglasses', 'Tie', 'Wallet', 'Gloves', 'Socks']
}

// Derived flat list for AI prompt
export const EXISTING_CATEGORY2 = Object.values(CATEGORY_HIERARCHY).flat()

// Strict Apparel Types
export const EXISTING_CATEGORY3 = [
    "Top", "Bottom", "Full Body", "Outerwear", "Footwear", "Accessories"
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
    if (!isGeminiConfigured()) {
        console.warn('Gemini API key not configured')
        throw new Error('MISSING_API_KEY')
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

### CATEGORY 3 - Apparel Type (MUST be one of these):
${EXISTING_CATEGORY3.join(', ')}

### CATEGORY 2 - Specific Item Type:
(Choose the most specific type that matches the Apparel Type, e.g. T-Shirt for Top, Sneakers for Footwear)
${EXISTING_CATEGORY2.join(', ')}

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
Respond with ONLY these lines in this exact format (no extra text, no markdown, no bolding):

title: [A short catchy title for this item, max 5 words]
description: [A brief 1-sentence description of the item]
ai_description: [A 2-3 sentence stylist description including: material/fabric guess, occasions this works for (e.g. casual, work, date night, parties), colors it pairs well with, and overall vibe. Write as a personal stylist giving advice.]
brand: [Brand name from the list, or Unknown]
color: [Primary color from the list]
category1: [Target audience from list]
category2: [Item type from list]
category3: [Apparel type from list]
category4: [Style/aesthetic from list]
issue: [Any detected quality issue, or "None" if image is good]

IMPORTANT: Only use values from the provided lists. Be accurate and helpful.`

        const content = await createGeminiVisionCompletion({
            systemPrompt,
            userPrompt: 'Analyze this clothing/fashion item and extract the attributes.',
            imageBase64,
            maxTokens: 500,
            temperature: 0.2
        })

        console.log('AI Response:', content) // Debug log

        // Clean content of markdown code blocks if present
        const cleanContent = content.replace(/```\w*\n/g, '').replace(/```/g, '')

        return parseTextResponse(cleanContent)

    } catch (error) {
        console.error('Gemini analysis failed:', error)
        return getFallbackAnalysis()
    }
}

// Parse the text response from AI
function parseTextResponse(content) {
    const lines = content.split('\n')
    const result = {
        title: '',
        description: '',
        ai_description: '',
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

        // Robust key cleaning: removes *, _, - and trims whitespace
        const key = line.substring(0, colonIndex).replace(/[*_\-]/g, '').trim().toLowerCase()
        const value = line.substring(colonIndex + 1).trim()

        switch (key) {
            case 'title': result.title = value; break
            case 'description': result.description = value; break
            case 'aidescription': result.ai_description = value; break
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
        ai_description: '',
        brand: '',
        color: '',
        category1: '',
        category2: '',
        category3: '',
        category4: '',
        issue: ''
    }
}

// Generate a short description/reasoning for an outfit
export async function generateOutfitDescription(mood, items) {
    if (!isGeminiConfigured()) {
        return "This outfit was curated to match your selected mood with a balance of style and comfort."
    }

    try {
        const itemDescriptions = items.map(i => `${i.title || i.name} (${i.color}, ${i.category})`).join(', ')

        const content = await createGeminiCompletion({
            systemPrompt: 'You are a personal stylist. Write a concise, engaging 1-2 sentence explanation of why this outfit works for the specific mood. Mention color coordination or style balance.',
            userPrompt: `Mood: ${mood}. Items: ${itemDescriptions}. Why is this a good outfit?`,
            maxTokens: 100,
            temperature: 0.7
        })

        return content || "A stylish combination perfect for the occasion."
    } catch (error) {
        console.error('Error generating description:', error)
        return "This outfit combines compatible colors and styles for a cohesive look."
    }
}
