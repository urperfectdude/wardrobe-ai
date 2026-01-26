import { useState, useEffect, useCallback } from 'react'
import { MagnifyingGlass, Funnel, Star, ArrowSquareOut, X, SlidersHorizontal, WarningCircle, ArrowCounterClockwise } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProducts } from '../utils/storage'
import { getProductUrl, PLATFORMS, STYLE_AESTHETICS } from '../utils/ecommerceSearch'
import { EXISTING_BRANDS, EXISTING_COLORS, EXISTING_CATEGORY3 } from '../utils/openaiAnalysis'

const MATERIALS = ['Cotton', 'Polyester', 'Silk', 'Denim', 'Wool', 'Linen', 'Leather', 'Velvet', 'Satin', 'Rayon']

export default function Shop() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    const [selectedPlatforms, setSelectedPlatforms] = useState([])
    const [selectedStyles, setSelectedStyles] = useState([])
    const [selectedBrands, setSelectedBrands] = useState([])
    const [selectedColors, setSelectedColors] = useState([])
    const [selectedMaterials, setSelectedMaterials] = useState([])
    const [selectedCategories, setSelectedCategories] = useState([]) // For Top, Bottom, etc.

    const [priceRange, setPriceRange] = useState([500, 10000])
    const [thriftFilter, setThriftFilter] = useState('both')
    const [sortBy, setSortBy] = useState('relevance')

    const fetchProducts = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const results = await getProducts({
                query: searchQuery,
                platforms: selectedPlatforms,
                styles: selectedStyles,
                brands: selectedBrands,
                colors: selectedColors,
                materials: selectedMaterials,
                categories: selectedCategories,
                priceRange,
                thriftFilter,
                sortBy
            })
            setProducts(results)
        } catch (err) {
            console.error('Error fetching products:', err)
            setError('Failed to load products. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [searchQuery, selectedPlatforms, selectedStyles, selectedBrands, selectedColors, selectedMaterials, selectedCategories, priceRange, thriftFilter, sortBy])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    const [activeFilterCategory, setActiveFilterCategory] = useState('platforms')

    // ... existing callbacks ...

    const toggleFilter = (setter, list, item) => {
        setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
    }

    const clearFilters = () => {
        setSelectedPlatforms([])
        setSelectedStyles([])
        setSelectedBrands([])
        setSelectedColors([])
        setSelectedMaterials([])
        setSelectedCategories([])
        setPriceRange([500, 10000])
        setThriftFilter('both')
        setSortBy('relevance')
    }

    const hasActiveFilters = selectedPlatforms.length > 0 || selectedStyles.length > 0 || selectedBrands.length > 0 || selectedColors.length > 0 || selectedMaterials.length > 0 || selectedCategories.length > 0 || sortBy !== 'relevance'

    // Error state
    if (error && !loading) {
        return (
            <div className="container">
                <div className="empty-state" style={{ minHeight: '60vh' }}>
                    <WarningCircle size={48} style={{ color: 'hsl(var(--destructive))' }} />
                    <h3>Something went wrong</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={fetchProducts}>
                        <ArrowCounterClockwise size={16} /> Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="container">
            {/* Header with Thrift Toggle */}
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Shop Fashion</h1>
                    <p className="text-muted text-sm">Find pieces from top Indian brands</p>
                </div>

                {/* Thrift Filter Dropdown - Top Right */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <select
                        className="input"
                        value={thriftFilter}
                        onChange={(e) => setThriftFilter(e.target.value)}
                        style={{
                            padding: '0.5rem 2rem 0.5rem 1rem',
                            fontSize: '0.8125rem',
                            height: '36px',
                            minWidth: '130px',
                            borderRadius: 'var(--radius-lg)',
                            background: 'hsl(var(--secondary))',
                            border: 'none'
                        }}
                    >
                        <option value="both">Both</option>
                        <option value="new">New</option>
                        <option value="thrifted">Thrifted</option>
                    </select>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <MagnifyingGlass size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} />
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
                    {hasActiveFilters && <span style={{ width: '8px', height: '8px', background: showFilters ? 'white' : 'hsl(var(--accent))', borderRadius: '50%', marginLeft: '0.25rem' }} />}
                </button>
            </div>

            {/* Split Filter Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="card" style={{ marginBottom: '1rem', padding: 0, display: 'flex', overflow: 'hidden', height: '400px' }}>
                            {/* Left Sidebar */}
                            <div style={{
                                width: '35%',
                                minWidth: '110px',
                                background: 'hsl(var(--secondary))',
                                borderRight: '1px solid hsl(var(--border))',
                                display: 'flex',
                                flexDirection: 'column',
                                overflowY: 'auto'
                            }}>
                                <div style={{ padding: '0.75rem', borderBottom: '1px solid hsl(var(--border))', fontWeight: 600, fontSize: '0.8125rem' }}>
                                    Filters
                                </div>
                                {['sort', 'platforms', 'price', 'brands', 'categories', 'styles', 'colors', 'materials'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setActiveFilterCategory(cat)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            textAlign: 'left',
                                            fontSize: '0.8125rem',
                                            background: activeFilterCategory === cat ? 'white' : 'transparent',
                                            borderLeft: activeFilterCategory === cat ? '3px solid hsl(var(--primary))' : '3px solid transparent',
                                            fontWeight: activeFilterCategory === cat ? 600 : 400,
                                            cursor: 'pointer',
                                            borderBottom: '1px solid hsl(var(--border) / 0.5)',
                                            width: '100%',
                                            borderTop: 'none',
                                            borderRight: 'none'
                                        }}
                                    >
                                        {cat === 'sort' ? 'Sort & Order' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        {((cat === 'platforms' && selectedPlatforms.length > 0) ||
                                            (cat === 'brands' && selectedBrands.length > 0) ||
                                            (cat === 'styles' && selectedStyles.length > 0) ||
                                            (cat === 'colors' && selectedColors.length > 0) ||
                                            (cat === 'materials' && selectedMaterials.length > 0) ||
                                            (cat === 'categories' && selectedCategories.length > 0) ||
                                            (cat === 'sort' && sortBy !== 'relevance')) &&
                                            <span style={{ marginLeft: '0.25rem', color: 'hsl(var(--accent))', fontSize: '0.625rem' }}>●</span>}
                                    </button>
                                ))}
                                <div style={{ marginTop: 'auto', padding: '0.75rem' }}>
                                    <button className="btn btn-outline btn-sm w-full" onClick={clearFilters} disabled={!hasActiveFilters} style={{ fontSize: '0.75rem' }}>
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            {/* Right Content */}
                            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                                {activeFilterCategory === 'sort' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {[
                                            { id: 'relevance', label: 'Relevance' },
                                            { id: 'price-low', label: 'Price: Low to High' },
                                            { id: 'price-high', label: 'Price: High to Low' },
                                            { id: 'rating', label: 'Top Rated' }
                                        ].map(opt => (
                                            <label key={opt.id} className="flex items-center gap-2" style={{ fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                                                <input
                                                    type="radio"
                                                    name="sort"
                                                    checked={sortBy === opt.id}
                                                    onChange={() => setSortBy(opt.id)}
                                                    style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }}
                                                />
                                                {opt.label}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {activeFilterCategory === 'platforms' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {Object.entries(PLATFORMS).map(([key, platform]) => (
                                            <label key={key} className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPlatforms.includes(key)}
                                                    onChange={() => toggleFilter(setSelectedPlatforms, selectedPlatforms, key)}
                                                    style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }}
                                                />
                                                {platform.name}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {activeFilterCategory === 'brands' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {EXISTING_BRANDS.map(brand => (
                                            <label key={brand} className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedBrands.includes(brand)}
                                                    onChange={() => toggleFilter(setSelectedBrands, selectedBrands, brand)}
                                                    style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }}
                                                />
                                                {brand}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {activeFilterCategory === 'categories' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {EXISTING_CATEGORY3.map(cat => (
                                            <label key={cat} className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategories.includes(cat)}
                                                    onChange={() => toggleFilter(setSelectedCategories, selectedCategories, cat)}
                                                    style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }}
                                                />
                                                {cat}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {activeFilterCategory === 'styles' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {STYLE_AESTHETICS.map(style => (
                                            <label key={style} className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStyles.includes(style)}
                                                    onChange={() => toggleFilter(setSelectedStyles, selectedStyles, style)}
                                                    style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }}
                                                />
                                                {style}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {activeFilterCategory === 'colors' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {EXISTING_COLORS.map(color => (
                                            <label key={color} className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedColors.includes(color)}
                                                    onChange={() => toggleFilter(setSelectedColors, selectedColors, color)}
                                                    style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }}
                                                />
                                                {color}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {activeFilterCategory === 'materials' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {MATERIALS.map(mat => (
                                            <label key={mat} className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMaterials.includes(mat)}
                                                    onChange={() => toggleFilter(setSelectedMaterials, selectedMaterials, mat)}
                                                    style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }}
                                                />
                                                {mat}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {activeFilterCategory === 'price' && (
                                    <div style={{ padding: '0.5rem 0' }}>
                                        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                                            <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                                ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}+
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            className="range-slider"
                                            min={500}
                                            max={10000}
                                            step={500}
                                            value={priceRange[1]}
                                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                            style={{ width: '100%' }}
                                        />
                                        <div className="range-values" style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                                            <span>Min: ₹500</span>
                                            <span>Max: ₹10,000+</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Results */}
            <div style={{ marginBottom: '0.75rem', fontSize: '0.8125rem', color: 'hsl(var(--muted-foreground))' }}>
                {loading ? 'Loading...' : `${products.length} products found`}
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
                    <Funnel className="empty-state-icon" />
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
                                {PLATFORMS[product.platform?.toLowerCase()] ? (
                                    <span className="product-platform">
                                        {PLATFORMS[product.platform?.toLowerCase()].name}
                                    </span>
                                ) : (
                                    product.platform && (
                                        <span className="product-platform">
                                            {product.platform}
                                        </span>
                                    )
                                )}
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
                                    {/* Removed Rating Component as per request */}
                                </div>
                            </div>
                        </motion.a>
                    ))}
                </div>
            )}
        </div>
    )
}
