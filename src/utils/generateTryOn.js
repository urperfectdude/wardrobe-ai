import { generateGeminiImage } from '../lib/gemini'
import { uploadImageToStorage as uploadImage, urlToBase64 } from './storage'
import { analyzeImageForGeneration } from './openaiAnalysis'

/**
 * Generates a Virtual Try-On image using Gemini Imagen 3
 * @param {Object} userProfile - User's profile data (skinColor, hairColor, bodyType, gender, age)
 * @param {Array} items - Array of wardrobe items to wear
 * @param {string} [userSelfieUrl] - Optional URL of user's selfie for reference
 * @returns {Promise<string>} - Public URL of the generated image
 */
export async function generateTryOn(userProfile, items, userSelfieUrl) {
    try {
        if (!items || items.length === 0) throw new Error('No items selected for try-on')

        // 1. Analyze Items Visually for Better Prompts
        console.log('Analyzing selected items for visual details...')
        const enrichedItems = await Promise.all(items.map(async (item) => {
            let visualDescription = ''
            try {
                if (item.image) {
                    console.log(`Analyzing item: ${item.title || item.category3}...`)
                    const base64 = await urlToBase64(item.image)
                    const analysis = await analyzeImageForGeneration(base64)
                    if (analysis) {
                        visualDescription = analysis
                        console.log(`AI Visual Description for ${item.title}:`, visualDescription)
                    }
                }
            } catch (err) {
                console.warn('Failed to analyze item image:', err)
            }

            // Fallback to metadata if analysis failed
            const baseDesc = `${item.color || ''} ${item.brand || ''} ${item.title || item.category3 || 'clothing item'}`
            
            return visualDescription ? `(${visualDescription})` : baseDesc
        }))

        // 1b. Categorize items by apparel type for a structured prompt
        const categorizedItems = {}
        items.forEach((item, idx) => {
            const type = (item.category3 || 'Other').toLowerCase()
            if (!categorizedItems[type]) categorizedItems[type] = []
            categorizedItems[type].push(enrichedItems[idx])
        })

        // Build structured outfit description
        const outfitParts = []
        const typeLabels = {
            top: 'Top/Shirt', bottom: 'Pants/Bottom', 'full body': 'Dress/Full-body',
            outerwear: 'Jacket/Outerwear', footwear: 'Shoes', accessories: 'Accessory'
        }
        for (const [type, descs] of Object.entries(categorizedItems)) {
            const label = typeLabels[type] || type
            outfitParts.push(`${label}: ${descs.join(' and ')}`)
        }
        const outfitDescription = outfitParts.join('. ')

        const userDescription = [
            userProfile.gender || 'person',
            userProfile.age ? `${userProfile.age} years old` : '',
            userProfile.bodyType ? `${userProfile.bodyType} body type` : '',
            userProfile.skinColor ? `${userProfile.skinColor} skin tone` : '',
            userProfile.hairColor ? `${userProfile.hairColor} hair` : ''
        ].filter(Boolean).join(', ')

        // Build a clear, single-model prompt
        const prompt = `Fashion editorial photograph of exactly ONE single ${userDescription || 'model'} wearing a complete outfit.

The outfit consists of: ${outfitDescription}.

All clothing items are worn together as ONE coordinated look on the SAME single person. 
The model is standing in a relaxed, confident pose against a clean solid white or light gray background.
Full-body shot from head to toe, centered in frame.
High-end fashion photography, soft studio lighting, photorealistic, magazine editorial style.
The clothing should drape naturally on the body, fitting realistically.

IMPORTANT: Show only ONE person. Do NOT show multiple models, collages, side-by-side views, or before-and-after comparisons. No split images. Just one single full-body photo of one person wearing all the items together.`

        console.log('Generating Try-On with prompt:', prompt)

        // 2. Call Gemini Image Gen
        // Note: We use the model configured in gemini.js (defaults to imagen-4.0-fast-generate-001)
        const images = await generateGeminiImage({
            prompt,
            numberOfImages: 1,
            aspectRatio: '3:4', // Vertical portrait aspect ratio
            model: 'imagen-4.0-fast-generate-001'
        })

        if (!images || images.length === 0) throw new Error('No image generated')

        const imageBase64 = images[0].base64
        // const mimeType = images[0].mimeType // usually image/png or image/jpeg

        // 3. Upload to Supabase Storage
        console.log('Image generated, preparing upload...')
        
        // Storage utility expects a Data URI string (base64 with prefix)
        const mimeType = images[0].mimeType || 'image/png'
        const dataUri = `data:${mimeType};base64,${imageBase64}`

        // Use existing uploadImage utility
        console.log('Uploading to storage...')
        const publicUrl = await uploadImage(dataUri)
        console.log('Upload complete:', publicUrl) 

        return publicUrl

    } catch (error) {
        console.error('Error in generateTryOn:', error)
        throw error
    }
}
