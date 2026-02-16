// Centralized Google Gemini Client
// Replaces OpenAI for vision analysis, chat completions, and image generation

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta'

/**
 * Get Gemini API key from environment
 * @returns {string|null} API key or null if not configured
 */
export function getGeminiKey() {
    return import.meta.env.VITE_GEMINI_API_KEY || null
}

/**
 * Check if Gemini is configured
 * @returns {boolean}
 */
export function isGeminiConfigured() {
    return !!getGeminiKey()
}

/**
 * Create a text generation using Gemini API
 * @param {Object} options
 * @param {string} options.prompt - The user prompt
 * @param {string} [options.systemPrompt] - System instruction
 * @param {string} [options.model='gemini-2.0-flash'] - Model to use
 * @param {number} [options.maxTokens=1000] - Max output tokens
 * @param {number} [options.temperature=0.7] - Temperature
 * @returns {Promise<string>} The generated text
 */
export async function createGeminiCompletion({
    prompt,
    systemPrompt = '',
    model = 'gemini-2.0-flash',
    maxTokens = 1000,
    temperature = 0.7
}) {
    const apiKey = getGeminiKey()
    if (!apiKey) throw new Error('Gemini API key not configured')

    const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            maxOutputTokens: maxTokens,
            temperature
        }
    }

    if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] }
    }

    const response = await fetch(
        `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }
    )

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Gemini API error:', response.status, errorData)
        throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/**
 * Create a vision completion (image analysis) using Gemini
 * @param {Object} options
 * @param {string} options.systemPrompt - System instruction
 * @param {string} options.userPrompt - User prompt text
 * @param {string} options.imageBase64 - Base64 encoded image (without data: prefix)
 * @param {string} [options.mimeType='image/jpeg'] - MIME type of the image
 * @param {string} [options.model='gemini-2.0-flash'] - Model to use
 * @param {number} [options.maxTokens=1000] - Max output tokens
 * @param {number} [options.temperature=0.2] - Temperature
 * @returns {Promise<string>} The generated text
 */
export async function createGeminiVisionCompletion({
    systemPrompt,
    userPrompt,
    imageBase64,
    mimeType = 'image/jpeg',
    model = 'gemini-2.0-flash',
    maxTokens = 1000,
    temperature = 0.2
}) {
    const apiKey = getGeminiKey()
    if (!apiKey) throw new Error('Gemini API key not configured')

    // Strip data URL prefix if present
    const cleanBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64.replace(/^data:image\/\w+;base64,/, '')

    const body = {
        contents: [{
            role: 'user',
            parts: [
                { text: userPrompt },
                {
                    inlineData: {
                        mimeType,
                        data: cleanBase64
                    }
                }
            ]
        }],
        generationConfig: {
            maxOutputTokens: maxTokens,
            temperature
        }
    }

    if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] }
    }

    const response = await fetch(
        `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }
    )

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Gemini Vision API error:', response.status, errorData)
        throw new Error(`Gemini Vision API error: ${response.status}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

/**
 * Generate an image using Gemini's image generation (Imagen 3)
 * @param {Object} options
 * @param {string} options.prompt - Text prompt describing the image
 * @param {string} [options.model='imagen-3.0-generate-002'] - Model to use
 * @param {number} [options.numberOfImages=1] - Number of images to generate
 * @param {string} [options.aspectRatio='1:1'] - Aspect ratio
 * @returns {Promise<Array<{base64: string, mimeType: string}>>} Generated images
 */
export async function generateGeminiImage({
    prompt,
    model = 'imagen-3.0-generate-002',
    numberOfImages = 1,
    aspectRatio = '1:1'
}) {
    const apiKey = getGeminiKey()
    if (!apiKey) throw new Error('Gemini API key not configured')

    const body = {
        instances: [{ prompt }],
        parameters: {
            sampleCount: numberOfImages,
            aspectRatio
        }
    }

    const response = await fetch(
        `${GEMINI_API_URL}/models/${model}:predict?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }
    )

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Gemini Image Gen error:', response.status, errorData)
        throw new Error(`Gemini Image Gen error: ${response.status}`)
    }

    const data = await response.json()
    return (data.predictions || []).map(p => ({
        base64: p.bytesBase64Encoded,
        mimeType: p.mimeType || 'image/png'
    }))
}
