// E-commerce helper utilities
// Products are fetched from Supabase in storage.js

const PLATFORMS = {
    myntra: { name: 'Myntra', color: '#ff3f6c', domain: 'myntra.com' },
    ajio: { name: 'Ajio', color: '#2a2a72', domain: 'ajio.com' },
    flipkart: { name: 'Flipkart', color: '#2874f0', domain: 'flipkart.com' },
    amazon: { name: 'Amazon', color: '#ff9900', domain: 'amazon.in' },
    tatacliq: { name: 'Tata CLiQ', color: '#622c91', domain: 'tatacliq.com' }
}

const STYLE_AESTHETICS = [
    'Ethnic/Traditional', 'Clean Girl', 'Baddie', 'Indie', 'Whimsical',
    'Office Siren', 'Cottagecore', 'Grunge/Goth', 'Mermaidcore', 'Streetwear',
    'Coquette', 'Old Money', 'Alt & Edgy', 'Y2K & 2000s'
]

function getProductUrl(product) {
    const searchQuery = encodeURIComponent(`${product.brand} ${product.name}`)

    switch (product.platform) {
        case 'myntra': return `https://www.myntra.com/${searchQuery.replace(/%20/g, '-')}`
        case 'ajio': return `https://www.ajio.com/search/?text=${searchQuery}`
        case 'flipkart': return `https://www.flipkart.com/search?q=${searchQuery}`
        case 'amazon': return `https://www.amazon.in/s?k=${searchQuery}`
        case 'tatacliq': return `https://www.tatacliq.com/search/?searchCategory=all&text=${searchQuery}`
        default: return '#'
    }
}

export { PLATFORMS, STYLE_AESTHETICS, getProductUrl }
