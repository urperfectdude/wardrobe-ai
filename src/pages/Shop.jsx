import { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Star, ExternalLink, X, SlidersHorizontal, AlertCircle, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProducts } from '../utils/storage'
import { getProductUrl, PLATFORMS, STYLE_AESTHETICS } from '../utils/ecommerceSearch'

export default function Shop() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    const [selectedPlatforms, setSelectedPlatforms] = useState([])
    const [selectedStyles, setSelectedStyles] = useState([])
    const [priceRange, setPriceRange] = useState([500, 10000])
    const [thriftedOnly, setThriftedOnly] = useState(false)
    const [sortBy, setSortBy] = useState('relevance')

    const fetchProducts = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const results = await getProducts({
                query: searchQuery,
                platforms: selectedPlatforms,
                styles: selectedStyles,
                priceRange,
                thriftedOnly,
                sortBy
            })
            setProducts(results)
        } catch (err) {
            console.error('Error fetching products:', err)
            setError('Failed to load products. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [searchQuery, selectedPlatforms, selectedStyles, priceRange, thriftedOnly, sortBy])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    const togglePlatform = (platform) => {
        setSelectedPlatforms(prev =>
            prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
        )
    }

    const toggleStyle = (style) => {
        setSelectedStyles(prev =>
            prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
        )
    }

    const clearFilters = () => {
        setSelectedPlatforms([])
        setSelectedStyles([])
        setPriceRange([500, 10000])
        setThriftedOnly(false)
        setSortBy('relevance')
    }

    const hasActiveFilters = selectedPlatforms.length > 0 || selectedStyles.length > 0 || thriftedOnly

    // Error state
    if (error && !loading) {
        return (
            <div className="container">
                <div className="empty-state" style={{ minHeight: '60vh' }}>
                    <AlertCircle size={48} style={{ color: 'hsl(var(--destructive))' }} />
                    <h3>Something went wrong</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={fetchProducts}>
                        <RefreshCw size={16} /> Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="container">
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ marginBottom: '0.25rem' }}>Shop Fashion</h1>
                <p className="text-muted text-sm">Find pieces from top Indian brands</p>
            </div>

            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
                    <input
                        type="text"
                        className="input"
                        placeholder="Search clothing..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
                <button
                    className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setShowFilters(!showFilters)}
                    style={{ flexShrink: 0 }}
                >
                    <SlidersHorizontal size={18} />
                    {hasActiveFilters && <span style={{ width: '6px', height: '6px', background: showFilters ? 'white' : 'hsl(var(--accent))', borderRadius: '50%' }} />}
                </button>
            </div>

            {/* Sort */}
            <div style={{ marginBottom: '1rem' }}>
                <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ width: '100%' }}>
                    <option value="relevance">Sort: Relevance</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Top Rated</option>
                </select>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span className="font-semibold">Filters</span>
                                {hasActiveFilters && (
                                    <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ minHeight: '36px', padding: '0.375rem 0.75rem' }}>
                                        <X size={14} /> Clear
                                    </button>
                                )}
                            </div>

                            <div className="filter-section" style={{ marginBottom: '1rem' }}>
                                <span className="filter-title">Platforms</span>
                                <div className="filter-chips">
                                    {Object.entries(PLATFORMS).map(([key, platform]) => (
                                        <button key={key} className={`chip chip-outline ${selectedPlatforms.includes(key) ? 'active' : ''}`} onClick={() => togglePlatform(key)}>
                                            {platform.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-section" style={{ marginBottom: '1rem' }}>
                                <span className="filter-title">Style Aesthetics</span>
                                <div className="filter-chips">
                                    {STYLE_AESTHETICS.map(style => (
                                        <button key={style} className={`chip chip-outline ${selectedStyles.includes(style) ? 'active' : ''}`} onClick={() => toggleStyle(style)}>
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-section" style={{ marginBottom: '1rem' }}>
                                <span className="filter-title">Price Range</span>
                                <input type="range" className="range-slider" min={500} max={10000} step={500} value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])} />
                                <div className="range-values">
                                    <span>₹{priceRange[0].toLocaleString()}</span>
                                    <span>₹{priceRange[1].toLocaleString()}+</span>
                                </div>
                            </div>

                            <div className="filter-section">
                                <label className="toggle">
                                    <input type="checkbox" checked={thriftedOnly} onChange={(e) => setThriftedOnly(e.target.checked)} />
                                    <span className="toggle-track"><span className="toggle-thumb" /></span>
                                    <span className="toggle-label">Thrifted only</span>
                                </label>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results */}
            <div style={{ marginBottom: '0.75rem', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>
                {loading ? 'Loading...' : `${products.length} products`}
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className="product-grid">
                    {[...Array(6)].map((_, idx) => (
                        <div key={idx} className="product-card">
                            <div className="skeleton" style={{ aspectRatio: '1' }} />
                            <div style={{ padding: '0.75rem' }}>
                                <div className="skeleton" style={{ height: '0.625rem', width: '50%', marginBottom: '0.5rem' }} />
                                <div className="skeleton" style={{ height: '0.875rem', marginBottom: '0.25rem' }} />
                                <div className="skeleton" style={{ height: '1rem', width: '45%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="empty-state">
                    <Filter className="empty-state-icon" />
                    <h3>No products found</h3>
                    <p>Try adjusting your filters</p>
                </div>
            ) : (
                <div className="product-grid">
                    {products.map((product, idx) => (
                        <motion.a
                            key={product.id}
                            href={getProductUrl(product)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="product-card"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <div className="product-image">
                                <img src={product.image} alt={product.name} />
                                {product.isThrifted && (
                                    <span style={{ position: 'absolute', top: '0.375rem', left: '0.375rem', padding: '0.125rem 0.375rem', background: 'hsl(var(--accent))', color: 'white', fontSize: '0.5625rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', textTransform: 'uppercase' }}>
                                        Thrifted
                                    </span>
                                )}
                            </div>
                            <div className="product-info">
                                <span className="product-platform">{PLATFORMS[product.platform]?.name}</span>
                                <h4 className="product-name">{product.name}</h4>
                                <p className="product-brand">{product.brand}</p>
                                <div className="product-footer">
                                    <div>
                                        <span className="product-price">₹{product.price.toLocaleString()}</span>
                                        {product.originalPrice > product.price && (
                                            <span style={{ fontSize: '0.625rem', color: 'hsl(var(--muted-foreground))', textDecoration: 'line-through', marginLeft: '0.375rem' }}>
                                                ₹{product.originalPrice.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="product-rating">
                                        <Star />
                                        <span>{product.rating}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.a>
                    ))}
                </div>
            )}
        </div>
    )
}
