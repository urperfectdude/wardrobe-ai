import { useState, useCallback, useEffect } from 'react'
import { Upload, X, Shirt, Trash2, Sparkles, Loader2, AlertCircle, RefreshCw, ChevronDown, Edit2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    getWardrobeItems,
    saveWardrobeItem,
    deleteWardrobeItem,
    imageToBase64,
    compressImage
} from '../utils/storage'
import {
    analyzeClothingImage,
    EXISTING_COLORS,
    EXISTING_BRANDS,
    EXISTING_CATEGORY1,
    EXISTING_CATEGORY2,
    EXISTING_CATEGORY3,
    EXISTING_CATEGORY4
} from '../utils/openaiAnalysis'

const COLORS = [
    { id: 'Black', hex: '#1a1a1a' },
    { id: 'White', hex: '#ffffff' },
    { id: 'Gray', hex: '#6b7280' },
    { id: 'Navy', hex: '#1e3a5f' },
    { id: 'Blue', hex: '#3b82f6' },
    { id: 'Red', hex: '#ef4444' },
    { id: 'Pink', hex: '#ec4899' },
    { id: 'Green', hex: '#22c55e' },
    { id: 'Yellow', hex: '#eab308' },
    { id: 'Orange', hex: '#f97316' },
    { id: 'Purple', hex: '#a855f7' },
    { id: 'Beige', hex: '#d4b896' },
    { id: 'Brown', hex: '#92400e' },
    { id: 'Cream', hex: '#f5f5dc' },
    { id: 'Maroon', hex: '#800000' },
    { id: 'Olive', hex: '#808000' },
    { id: 'Teal', hex: '#008080' },
    { id: 'Coral', hex: '#ff7f50' },
    { id: 'Burgundy', hex: '#800020' },
    { id: 'Gold', hex: '#ffd700' },
    { id: 'Silver', hex: '#c0c0c0' },
    { id: 'Multi', hex: 'linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb)' }
]

const CATEGORY_ICONS = {
    'Top': '👕', 'Bottom': '👖', 'Dress': '👗', 'Outerwear': '🧥',
    'Ethnic': '🪷', 'Activewear': '🏃', 'Sneakers': '👟', 'Heels': '👠',
    'Flats': '🥿', 'Boots': '👢', 'Sandals': '🩴', 'Sleepwear': '🛏️',
    'Innerwear': '🩲'
}

export default function MyCloset() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadPreview, setUploadPreview] = useState(null)
    const [filterCategory, setFilterCategory] = useState('all')
    const [dragOver, setDragOver] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState(null)
    const [analyzing, setAnalyzing] = useState(false)

    // All AI-detected fields are editable
    const [analysis, setAnalysis] = useState({
        title: '',
        description: '',
        brand: '',
        color: '',
        category1: '',
        category2: '',
        category3: '',
        category4: '',
        issue: ''
    })

    const loadItems = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const wardrobeItems = await getWardrobeItems()
            setItems(wardrobeItems)
        } catch (err) {
            console.error('Failed to load:', err)
            setError('Failed to load wardrobe. Please check your connection.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadItems()
    }, [loadItems])

    const resetForm = () => {
        setUploadPreview(null)
        setAnalysis({
            title: '', description: '', brand: '', color: '',
            category1: '', category2: '', category3: '', category4: '', issue: ''
        })
        setIsUploading(false)
        setAnalyzing(false)
        setSaveError(null)
    }

    const handleFileSelect = useCallback(async (file) => {
        if (!file || !file.type.startsWith('image/')) return

        try {
            const base64 = await imageToBase64(file)
            const compressed = await compressImage(base64, 600) // Higher quality for AI
            setUploadPreview(compressed)
            setIsUploading(true)
            setAnalyzing(true)
            setSaveError(null)

            const result = await analyzeClothingImage(compressed)
            console.log('Analysis result:', result)
            setAnalysis(result)
            setAnalyzing(false)
        } catch (err) {
            console.error('Error processing image:', err)
            setAnalyzing(false)
        }
    }, [])

    const handleDrop = useCallback((e) => {
        e.preventDefault()
        setDragOver(false)
        handleFileSelect(e.dataTransfer.files[0])
    }, [handleFileSelect])

    const handleSave = useCallback(async () => {
        if (!uploadPreview || !analysis.category3 || !analysis.color) return

        setSaving(true)
        setSaveError(null)
        try {
            const newItem = await saveWardrobeItem({
                image: uploadPreview,
                title: analysis.title,
                description: analysis.description,
                brand: analysis.brand,
                color: analysis.color,
                category: analysis.category3,
                category1: analysis.category1,
                category2: analysis.category2,
                category3: analysis.category3,
                category4: analysis.category4,
                issue: analysis.issue
            })

            setItems(prev => [newItem, ...prev])
            resetForm()
        } catch (err) {
            console.error('Error saving item:', err)
            setSaveError('Failed to save. Please try again.')
        } finally {
            setSaving(false)
        }
    }, [uploadPreview, analysis])

    const handleDelete = useCallback(async (id) => {
        try {
            await deleteWardrobeItem(id)
            setItems(prev => prev.filter(item => item.id !== id))
        } catch (err) {
            console.error('Error deleting:', err)
            setError('Failed to delete item.')
        }
    }, [])

    const updateField = (field, value) => {
        setAnalysis(prev => ({ ...prev, [field]: value }))
    }

    const filteredItems = filterCategory === 'all'
        ? items
        : items.filter(item => item.category === filterCategory || item.category3 === filterCategory)

    // Error state
    if (error && !loading) {
        return (
            <div className="container">
                <div className="empty-state" style={{ minHeight: '60vh' }}>
                    <AlertCircle size={48} style={{ color: 'hsl(var(--destructive))' }} />
                    <h3>Something went wrong</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={loadItems}>
                        <RefreshCw size={16} /> Try Again
                    </button>
                </div>
            </div>
        )
    }

    // Loading state
    if (loading) {
        return (
            <div className="container">
                <div style={{ marginBottom: '1rem' }}>
                    <h1 style={{ marginBottom: '0.25rem' }}>My Closet</h1>
                    <p className="text-muted text-sm">Loading...</p>
                </div>
                <div className="closet-grid">
                    {[...Array(6)].map((_, idx) => (
                        <div key={idx} className="skeleton" style={{ aspectRatio: '3/4', borderRadius: 'var(--radius-lg)' }} />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="container">
            <div style={{ marginBottom: '1rem' }}>
                <h1 style={{ marginBottom: '0.25rem' }}>My Closet</h1>
                <p className="text-muted text-sm">AI auto-detects style & category</p>
            </div>

            {/* Upload Zone */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`dropzone ${dragOver ? 'dragover' : ''}`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                style={{ marginBottom: '1.5rem' }}
            >
                <input type="file" accept="image/*" onChange={(e) => handleFileSelect(e.target.files[0])} />
                <Upload className="dropzone-icon" />
                <div className="dropzone-text">
                    <h4>Drop clothes here</h4>
                    <p>AI detects color, style & issues</p>
                </div>
            </motion.div>

            {/* Upload/Edit Modal */}
            <AnimatePresence>
                {isUploading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                            zIndex: 1000, padding: '1rem', overflowY: 'auto', paddingTop: '2rem', paddingBottom: '6rem'
                        }}
                        onClick={() => !saving && !analyzing && resetForm()}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="card"
                            style={{ maxWidth: '420px', width: '100%', padding: '1rem' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h3 style={{ fontSize: '1rem', margin: 0 }}>Add to Closet</h3>
                                <button className="btn btn-icon btn-ghost btn-sm" onClick={resetForm} disabled={saving || analyzing}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Preview Image */}
                            <div style={{ position: 'relative', aspectRatio: '4/5', maxHeight: '200px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '0.75rem', background: 'hsl(var(--muted))' }}>
                                <img src={uploadPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {analyzing && (
                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'white' }}>
                                        <Loader2 size={28} className="animate-spin" />
                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>AI Analyzing...</span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Detecting attributes</span>
                                    </div>
                                )}
                            </div>

                            {/* AI Detection Badge */}
                            {!analyzing && (analysis.title || analysis.color) && (
                                <div style={{ background: 'hsl(var(--green-100))', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <Sparkles size={14} style={{ color: 'hsl(var(--accent))' }} />
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--accent))' }}>AI Detected - Edit below if needed</span>
                                </div>
                            )}

                            {/* Issue Warning */}
                            {analysis.issue && analysis.issue.toLowerCase() !== 'none' && (
                                <div style={{ background: 'hsl(0 84% 95%)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <AlertCircle size={14} style={{ color: 'hsl(0 84% 50%)' }} />
                                    <span style={{ fontSize: '0.75rem', color: 'hsl(0 84% 40%)' }}>{analysis.issue}</span>
                                </div>
                            )}

                            {/* Save Error */}
                            {saveError && (
                                <div style={{ background: 'hsl(0 84% 95%)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                    <AlertCircle size={14} style={{ color: 'hsl(0 84% 50%)' }} />
                                    <span style={{ fontSize: '0.75rem', color: 'hsl(0 84% 40%)' }}>{saveError}</span>
                                </div>
                            )}

                            {/* Editable Fields */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                                {/* Title */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.6875rem', marginBottom: '0.25rem' }}>Title</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g., Black Cotton T-Shirt"
                                        value={analysis.title}
                                        onChange={(e) => updateField('title', e.target.value)}
                                        style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem' }}
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.6875rem', marginBottom: '0.25rem' }}>Description</label>
                                    <textarea
                                        className="input"
                                        placeholder="Brief description..."
                                        value={analysis.description}
                                        onChange={(e) => updateField('description', e.target.value)}
                                        rows={2}
                                        style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem', resize: 'none' }}
                                    />
                                </div>

                                {/* Brand Dropdown */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.6875rem', marginBottom: '0.25rem' }}>Brand</label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            className="input"
                                            value={analysis.brand}
                                            onChange={(e) => updateField('brand', e.target.value)}
                                            style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem', paddingRight: '2rem', appearance: 'none' }}
                                        >
                                            <option value="">Select brand</option>
                                            {EXISTING_BRANDS.map(brand => (
                                                <option key={brand} value={brand}>{brand}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                                    </div>
                                </div>

                                {/* Color Selection (visual) */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.6875rem', marginBottom: '0.25rem' }}>Color *</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                                        {COLORS.map(color => (
                                            <button
                                                key={color.id}
                                                onClick={() => updateField('color', color.id)}
                                                style={{
                                                    width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                                                    border: analysis.color === color.id ? '3px solid hsl(var(--accent))' : '2px solid hsl(var(--border))',
                                                    background: color.hex, cursor: 'pointer',
                                                    boxShadow: analysis.color === color.id ? '0 0 0 2px white' : 'none'
                                                }}
                                                title={color.id}
                                                type="button"
                                            />
                                        ))}
                                    </div>
                                    {analysis.color && <span style={{ fontSize: '0.6875rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem', display: 'block' }}>Selected: {analysis.color}</span>}
                                </div>

                                {/* Category 1 - Audience */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.6875rem', marginBottom: '0.25rem' }}>For Whom</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {EXISTING_CATEGORY1.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                className={`chip chip-outline ${analysis.category1 === cat ? 'active' : ''}`}
                                                onClick={() => updateField('category1', cat)}
                                                style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '28px' }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Category 2 - Item Type */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.6875rem', marginBottom: '0.25rem' }}>Item Type</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {EXISTING_CATEGORY2.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                className={`chip chip-outline ${analysis.category2 === cat ? 'active' : ''}`}
                                                onClick={() => updateField('category2', cat)}
                                                style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '28px' }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Category 3 - Apparel Type (Required) */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.6875rem', marginBottom: '0.25rem' }}>Apparel Type *</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {EXISTING_CATEGORY3.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                className={`chip chip-outline ${analysis.category3 === cat ? 'active' : ''}`}
                                                onClick={() => updateField('category3', cat)}
                                                style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '28px' }}
                                            >
                                                {CATEGORY_ICONS[cat] || '👔'} {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Category 4 - Style/Aesthetic */}
                                <div>
                                    <label className="label" style={{ fontSize: '0.6875rem', marginBottom: '0.25rem' }}>Style / Aesthetic</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxHeight: '100px', overflowY: 'auto', padding: '0.25rem 0' }}>
                                        {EXISTING_CATEGORY4.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                className={`chip chip-outline ${analysis.category4 === cat ? 'active' : ''}`}
                                                onClick={() => updateField('category4', cat)}
                                                style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '28px' }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <button
                                className="btn btn-primary w-full"
                                onClick={handleSave}
                                disabled={!analysis.category3 || !analysis.color || saving || analyzing}
                                style={{ marginTop: '1rem' }}
                            >
                                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Shirt size={16} /> Add to Closet</>}
                            </button>

                            {/* Required fields note */}
                            <p style={{ fontSize: '0.625rem', color: 'hsl(var(--muted-foreground))', textAlign: 'center', marginTop: '0.5rem' }}>
                                * Color and Apparel Type are required
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filter */}
            <div style={{ marginBottom: '1rem', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                    <button className={`chip ${filterCategory === 'all' ? 'active' : ''}`} onClick={() => setFilterCategory('all')} style={{ fontSize: '0.6875rem', minHeight: '28px' }}>
                        All ({items.length})
                    </button>
                    {EXISTING_CATEGORY3.filter(cat => items.some(i => i.category === cat || i.category3 === cat)).map(cat => (
                        <button
                            key={cat}
                            className={`chip ${filterCategory === cat ? 'active' : ''}`}
                            onClick={() => setFilterCategory(cat)}
                            style={{ fontSize: '0.6875rem', minHeight: '28px' }}
                        >
                            {CATEGORY_ICONS[cat] || '👔'} {items.filter(i => i.category === cat || i.category3 === cat).length}
                        </button>
                    ))}
                </div>
            </div>

            {/* Closet Grid */}
            {filteredItems.length === 0 ? (
                <div className="empty-state">
                    <Shirt className="empty-state-icon" />
                    <h3>Your closet is empty</h3>
                    <p>Upload clothes to get AI-powered styling</p>
                </div>
            ) : (
                <div className="closet-grid">
                    {filteredItems.map((item, idx) => (
                        <motion.div key={item.id} className="closet-item" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}>
                            <img src={item.image} alt={item.title || item.category} />
                            <div className="closet-item-overlay">
                                <span className="closet-item-category">{item.title || item.category3 || item.category}</span>
                                {item.category4 && (
                                    <span style={{ fontSize: '0.5rem', background: 'hsl(var(--accent))', color: 'white', padding: '0.125rem 0.25rem', borderRadius: '4px', marginTop: '0.125rem' }}>
                                        {item.category4}
                                    </span>
                                )}
                            </div>
                            <div className="closet-item-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <a
                                    href="https://qilin.in"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm"
                                    style={{
                                        background: 'hsl(var(--accent))',
                                        color: 'white',
                                        fontSize: '0.5rem',
                                        padding: '0.25rem 0.5rem',
                                        minHeight: 'unset',
                                        borderRadius: '4px',
                                        textDecoration: 'none'
                                    }}
                                >
                                    💰 Sell it
                                </a>
                                <button className="btn btn-icon btn-ghost btn-sm" style={{ background: 'rgba(255,255,255,0.9)', color: 'hsl(var(--destructive))', width: '28px', height: '28px' }} onClick={() => handleDelete(item.id)}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
