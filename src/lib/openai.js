// Centralized OpenAI Client
// Note: API calls should eventually move to Supabase Edge Functions for security

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

/**
 * Get OpenAI API key from environment
 * @returns {string|null} API key or null if not configured
 */
export function getOpenAIKey() {
    return import.meta.env.VITE_OPENAI_API_KEY || null
}

/**
 * Check if OpenAI is configured
 * @returns {boolean}
 */
export function isOpenAIConfigured() {
    return !!getOpenAIKey()
}

/**
 * Create a chat completion using OpenAI API
 * @param {Object} options - Options for the completion
 * @param {Array} options.messages - Array of message objects with role and content
 * @param {string} [options.model='gpt-4o-mini'] - Model to use
 * @param {number} [options.maxTokens=500] - Max tokens for response
 * @param {number} [options.temperature=0.7] - Temperature for response
 * @returns {Promise<string>} The assistant's response content
 */
export async function createChatCompletion({
    messages,
    model = 'gpt-4o-mini',
    maxTokens = 500,
    temperature = 0.7
}) {
    const apiKey = getOpenAIKey()

    if (!apiKey) {
        throw new Error('OpenAI API key not configured')
    }

    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            max_tokens: maxTokens,
            temperature
        })
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('OpenAI API error:', response.status, errorData)
        throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
}

/**
 * Create a vision completion (image analysis) using OpenAI API
 * @param {Object} options - Options for the completion
 * @param {string} options.systemPrompt - System prompt for the AI
 * @param {string} options.userPrompt - User prompt text
 * @param {string} options.imageBase64 - Base64 encoded image data
 * @param {string} [options.model='gpt-4o-mini'] - Model to use
 * @param {number} [options.maxTokens=500] - Max tokens for response
 * @param {number} [options.temperature=0.2] - Temperature for response
 * @param {string} [options.detail='high'] - Image detail level
 * @returns {Promise<string>} The assistant's response content
 */
export async function createVisionCompletion({
    systemPrompt,
    userPrompt,
    imageBase64,
    model = 'gpt-4o-mini',
    maxTokens = 500,
    temperature = 0.2,
    detail = 'high'
}) {
    const apiKey = getOpenAIKey()

    if (!apiKey) {
        throw new Error('OpenAI API key not configured')
    }

    // Ensure image has proper data URL prefix
    const imageUrl = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`

    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userPrompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl,
                                detail
                            }
                        }
                    ]
                }
            ],
            max_tokens: maxTokens,
            temperature
        })
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('OpenAI API error:', response.status, errorData)
        throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
}
