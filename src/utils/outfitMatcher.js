// Outfit Matching Algorithm
// Matches clothing items based on color theory, category pairing, and occasion
// Updated to use category3 field from AI analysis

// Color palettes that work well together
const COLOR_HARMONIES = {
    neutral: ['black', 'white', 'gray', 'beige', 'cream', 'navy', 'brown', 'khaki'],
    warm: ['red', 'orange', 'yellow', 'coral', 'peach', 'burgundy', 'maroon', 'rust'],
    cool: ['blue', 'green', 'purple', 'teal', 'mint', 'lavender', 'cyan'],
    earth: ['brown', 'olive', 'tan', 'terracotta', 'mustard', 'forest green'],
    pastel: ['pink', 'baby blue', 'mint', 'peach', 'lavender', 'cream']
}

// What goes well together
const COMPLEMENTARY_PAIRS = {
    'blue': ['orange', 'coral', 'mustard', 'beige', 'white', 'gray'],
    'red': ['green', 'navy', 'cream', 'black', 'white'],
    'yellow': ['purple', 'navy', 'gray', 'denim'],
    'green': ['pink', 'burgundy', 'cream', 'white'],
    'purple': ['yellow', 'orange', 'cream', 'gray'],
    'pink': ['gray', 'navy', 'olive', 'white', 'cream'],
    'orange': ['blue', 'navy', 'teal', 'cream'],
    'black': ['white', 'red', 'pink', 'yellow', 'any'],
    'white': ['any'],
    'gray': ['any'],
    'navy': ['white', 'cream', 'coral', 'pink', 'mustard'],
    'beige': ['navy', 'brown', 'olive', 'burgundy', 'white'],
    'brown': ['cream', 'white', 'blue', 'green'],
    'maroon': ['white', 'cream', 'beige', 'gold'],
    'olive': ['cream', 'white', 'brown', 'burgundy'],
    'teal': ['coral', 'cream', 'white', 'gold'],
    'coral': ['navy', 'teal', 'white', 'cream'],
    'burgundy': ['cream', 'white', 'gold', 'beige'],
    'gold': ['black', 'navy', 'burgundy', 'cream'],
    'silver': ['black', 'navy', 'white', 'gray']
}

// Helper to get item category (supports both old and new field names)
function getItemCategory(item) {
    // Use category3 (AI field) or fall back to category (legacy)
    return (item.category3 || item.category || '').toLowerCase()
}

// Map of category3 values to category types
const CATEGORY_TYPES = {
    // Tops
    'top': 'tops',
    'tops': 'tops',

    // Bottoms
    'bottom': 'bottoms',
    'bottoms': 'bottoms',

    // Dresses
    'dress': 'dresses',
    'dresses': 'dresses',

    // Outerwear
    'outerwear': 'outerwear',

    // Activewear
    'activewear': 'activewear',

    // Ethnic
    'ethnic': 'ethnic',

    // Footwear
    'sneakers': 'shoes',
    'heels': 'shoes',
    'flats': 'shoes',
    'boots': 'shoes',
    'sandals': 'shoes',
    'footwear': 'shoes',
    'shoes': 'shoes',

    // Sleepwear & Innerwear
    'sleepwear': 'sleepwear',
    'innerwear': 'innerwear'
}

function getCategoryType(item) {
    const cat = getItemCategory(item)
    return CATEGORY_TYPES[cat] || cat
}

// Occasion-appropriate categories
const OCCASION_CATEGORIES = {
    'party': {
        preferred: ['dresses', 'tops', 'ethnic', 'outerwear'],
        styles: ['Baddie', 'Y2K', 'Coquette', 'E-Girl'],
        colors: ['black', 'red', 'gold', 'silver', 'pink', 'burgundy']
    },
    'office': {
        preferred: ['tops', 'bottoms', 'outerwear', 'dresses'],
        styles: ['Old Money', 'Minimalist', 'Clean Girl', 'Office Siren'],
        colors: ['navy', 'black', 'white', 'gray', 'beige', 'cream']
    },
    'casual': {
        preferred: ['tops', 'bottoms', 'dresses', 'activewear'],
        styles: ['Casual', 'Athleisure', 'Streetwear', 'Indie'],
        colors: ['any']
    },
    'date': {
        preferred: ['dresses', 'tops', 'ethnic'],
        styles: ['Coquette', 'Soft Girl', 'Clean Girl', 'Old Money'],
        colors: ['red', 'pink', 'black', 'burgundy', 'cream']
    },
    'wedding': {
        preferred: ['dresses', 'ethnic', 'outerwear'],
        styles: ['Ethnic/Traditional', 'Formal', 'Old Money'],
        colors: ['pink', 'gold', 'cream', 'maroon', 'teal']
    },
    'vacation': {
        preferred: ['dresses', 'tops', 'bottoms', 'activewear'],
        styles: ['Coastal', 'Boho', 'Whimsical', 'Indie'],
        colors: ['white', 'beige', 'blue', 'coral', 'yellow']
    }
}

// Check if two colors go well together
function colorsMatch(color1, color2) {
    if (!color1 || !color2) return true

    const c1 = color1.toLowerCase()
    const c2 = color2.toLowerCase()

    // Same color (monochrome) works
    if (c1 === c2) return true

    // Neutrals go with everything
    if (COLOR_HARMONIES.neutral.includes(c1) || COLOR_HARMONIES.neutral.includes(c2)) {
        return true
    }

    // Check complementary pairs
    const pairs = COMPLEMENTARY_PAIRS[c1]
    if (pairs) {
        return pairs.includes('any') || pairs.includes(c2)
    }

    // Check if in same color family
    for (const harmony of Object.values(COLOR_HARMONIES)) {
        if (harmony.includes(c1) && harmony.includes(c2)) {
            return true
        }
    }

    return false
}

// Score an outfit combination
function scoreOutfit(items, occasion) {
    let score = 0

    // Base score for having items
    score += items.length * 5

    // Check color harmony between all items
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            if (colorsMatch(items[i].color, items[j].color)) {
                score += 10
            }
        }
    }

    // Check occasion appropriateness
    if (occasion && OCCASION_CATEGORIES[occasion]) {
        const occasionRules = OCCASION_CATEGORIES[occasion]

        items.forEach(item => {
            const catType = getCategoryType(item)

            // Category match
            if (occasionRules.preferred.includes(catType)) {
                score += 15
            }

            // Color match
            const itemColor = (item.color || '').toLowerCase()
            if (occasionRules.colors.includes('any') || occasionRules.colors.includes(itemColor)) {
                score += 5
            }

            // Style match (category4)
            const itemStyle = item.category4 || ''
            if (occasionRules.styles.some(s => s.toLowerCase() === itemStyle.toLowerCase())) {
                score += 20
            }
        })
    }

    return score
}

// Generate outfit suggestions from wardrobe
export function generateOutfit(wardrobeItems, occasion, count = 1) {
    if (!wardrobeItems || wardrobeItems.length < 2) {
        return []
    }

    // Categorize items using the new category structure
    const tops = wardrobeItems.filter(item => getCategoryType(item) === 'tops')
    const bottoms = wardrobeItems.filter(item => getCategoryType(item) === 'bottoms')
    const dresses = wardrobeItems.filter(item => ['dresses', 'ethnic'].includes(getCategoryType(item)))
    const shoes = wardrobeItems.filter(item => getCategoryType(item) === 'shoes')
    const outerwear = wardrobeItems.filter(item => getCategoryType(item) === 'outerwear')

    console.log('Outfit generation - Item counts:', {
        total: wardrobeItems.length,
        tops: tops.length,
        bottoms: bottoms.length,
        dresses: dresses.length,
        shoes: shoes.length,
        outerwear: outerwear.length
    })

    const outfits = []

    // Generate top + bottom combinations
    if (tops.length > 0 && bottoms.length > 0) {
        tops.forEach(top => {
            bottoms.forEach(bottom => {
                if (colorsMatch(top.color, bottom.color)) {
                    const outfit = {
                        items: [top, bottom],
                        score: scoreOutfit([top, bottom], occasion)
                    }

                    // Add matching shoes if available
                    const matchingShoe = shoes.find(shoe =>
                        colorsMatch(shoe.color, top.color) || colorsMatch(shoe.color, bottom.color)
                    )
                    if (matchingShoe) {
                        outfit.items.push(matchingShoe)
                        outfit.score += 5
                    }

                    // Add outerwear for some occasions
                    if (['office', 'party', 'wedding'].includes(occasion) && outerwear.length > 0) {
                        const matchingOuterwear = outerwear.find(o =>
                            colorsMatch(o.color, top.color) || colorsMatch(o.color, bottom.color)
                        )
                        if (matchingOuterwear) {
                            outfit.items.push(matchingOuterwear)
                            outfit.score += 5
                        }
                    }

                    outfits.push(outfit)
                }
            })
        })
    }

    // Add dress combinations
    if (dresses.length > 0) {
        dresses.forEach(dress => {
            const outfit = {
                items: [dress],
                score: scoreOutfit([dress], occasion) + 10 // Bonus for complete look
            }

            const matchingShoe = shoes.find(shoe => colorsMatch(shoe.color, dress.color))
            if (matchingShoe) {
                outfit.items.push(matchingShoe)
                outfit.score += 5
            }

            // Add outerwear if available
            if (outerwear.length > 0) {
                const matching = outerwear.find(o => colorsMatch(o.color, dress.color))
                if (matching) {
                    outfit.items.push(matching)
                    outfit.score += 5
                }
            }

            outfits.push(outfit)
        })
    }

    // Fallback: if no combinations found, just pair any 2 items that match colors
    if (outfits.length === 0 && wardrobeItems.length >= 2) {
        console.log('No standard combinations, trying fallback matching...')
        for (let i = 0; i < wardrobeItems.length; i++) {
            for (let j = i + 1; j < wardrobeItems.length; j++) {
                if (colorsMatch(wardrobeItems[i].color, wardrobeItems[j].color)) {
                    outfits.push({
                        items: [wardrobeItems[i], wardrobeItems[j]],
                        score: scoreOutfit([wardrobeItems[i], wardrobeItems[j]], occasion)
                    })
                }
            }
        }
    }

    // If still no outfits, just return random items
    if (outfits.length === 0 && wardrobeItems.length >= 2) {
        console.log('Using random combination...')
        const shuffled = [...wardrobeItems].sort(() => Math.random() - 0.5)
        outfits.push({
            items: shuffled.slice(0, Math.min(3, shuffled.length)),
            score: 0
        })
    }

    console.log('Generated outfits:', outfits.length)

    // Sort by score and return top results
    outfits.sort((a, b) => b.score - a.score)

    // Add some randomization for variety
    const shuffled = outfits
        .slice(0, Math.min(20, outfits.length))
        .sort(() => Math.random() - 0.5)

    return shuffled.slice(0, count)
}

// Get missing item suggestions based on current wardrobe
export function getMissingItems(wardrobeItems, occasion) {
    const categoryTypes = new Set(wardrobeItems.map(item => getCategoryType(item)))
    const suggestions = []

    if (occasion && OCCASION_CATEGORIES[occasion]) {
        const preferred = OCCASION_CATEGORIES[occasion].preferred
        preferred.forEach(cat => {
            if (!categoryTypes.has(cat)) {
                suggestions.push({
                    category: cat,
                    reason: `Perfect for ${occasion}`,
                    styles: OCCASION_CATEGORIES[occasion].styles
                })
            }
        })
    }

    // General suggestions
    if (!categoryTypes.has('tops')) suggestions.push({ category: 'tops', reason: 'Wardrobe staple' })
    if (!categoryTypes.has('bottoms')) suggestions.push({ category: 'bottoms', reason: 'Wardrobe staple' })
    if (!categoryTypes.has('shoes')) suggestions.push({ category: 'shoes', reason: 'Complete your look' })

    return suggestions
}

// Score how well a product matches user preferences
export function scoreProductMatch(product, preferences) {
    if (!preferences) return 0
    let score = 0

    // Gender match (+20)
    const prodGender = (product.gender || '').toLowerCase()
    const prefGender = (preferences.gender || '').toLowerCase()
    if (prodGender && prefGender) {
        if (prodGender === prefGender || prodGender === 'unisex') {
            score += 20
        }
    }

    // Color match (+15)
    const prodColor = (product.color || '').toLowerCase()
    const prefColors = (preferences.preferredColors || []).map(c => c.toLowerCase())
    if (prodColor && prefColors.length > 0 && prefColors.includes(prodColor)) {
        score += 15
    }

    // Style match (+15)
    const prodStyle = (product.style || product.category4 || '').toLowerCase()
    const prodStyles = (product.styles || []).map(s => s.toLowerCase())
    const prefStyles = (preferences.preferredStyles || []).map(s => s.toLowerCase())
    if (prefStyles.length > 0) {
        if (prefStyles.includes(prodStyle) || prodStyles.some(s => prefStyles.includes(s))) {
            score += 15
        }
    }

    // Material match (+10)
    const prodMaterial = (product.material || '').toLowerCase()
    const prefMaterials = (preferences.materials || []).map(m => m.toLowerCase())
    if (prodMaterial && prefMaterials.length > 0 && prefMaterials.includes(prodMaterial)) {
        score += 10
    }

    // Fit type match (+10)
    const prodFit = (product.fit_type || '').toLowerCase()
    const prefFits = (preferences.fitType || []).map(f => f.toLowerCase())
    if (prodFit && prefFits.length > 0 && prefFits.includes(prodFit)) {
        score += 10
    }

    // Size overlap (+10)
    const prodSizes = (product.sizes || []).map(s => s.toUpperCase())
    const prefSizes = (preferences.sizes || []).map(s => s.toUpperCase())
    if (prodSizes.length > 0 && prefSizes.length > 0 && prodSizes.some(s => prefSizes.includes(s))) {
        score += 10
    }

    return score
}

export { OCCASION_CATEGORIES, COLOR_HARMONIES }
