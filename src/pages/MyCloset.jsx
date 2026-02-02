import { useState, useCallback, useEffect, useRef } from 'react'
import { UploadSimple, X, TShirt, Trash, Sparkle, SpinnerGap, WarningCircle, ArrowCounterClockwise, CaretDown, PencilSimple, Check, SignIn } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    getWardrobeItems,
    saveWardrobeItem,
    deleteWardrobeItem,
    imageToBase64,
    compressImage
} from '../utils/storage'
import { useAuth } from '../contexts/AuthContext'
import OnboardingFlow from '../components/OnboardingFlow'
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
    const { user } = useAuth()

    // Main Closet State
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filterCategory, setFilterCategory] = useState('all')
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [showLogin, setShowLogin] = useState(false)
    const [dragOver, setDragOver] = useState(false)

    // Upload/Save State
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState(null)

    // Unified Upload State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [uploadQueue, setUploadQueue] = useState([]) // Array of {id, file, image, analysis, status: 'analyzing'|'done'|'error', error: null}
    const [activeUploadTab, setActiveUploadTab] = useState(0)

    // Refs for file inputs
    const singleFileInputRef = useRef(null)

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
        setIsUploadModalOpen(false)
        setUploadQueue([])
        setActiveUploadTab(0)
        setSaveError(null)
    }

    // Unified file processor
    const processFiles = useCallback(async (files) => {
        if (!user) {
            setShowLogin(true)
            return
        }
        if (!files || files.length === 0) return

        const fileArray = Array.from(files)

        // Initialize items
        const initialItems = fileArray.map((file, idx) => ({
            id: `upload-${Date.now()}-${idx}`,
            file,
            image: null,
            analysis: {
                title: '', description: '', ai_description: '', brand: '', color: '',
                category1: '', category2: '', category3: '', category4: '', issue: ''
            },
            status: 'analyzing',
            error: null
        }))

        setUploadQueue(initialItems)
        setIsUploadModalOpen(true)
        setActiveUploadTab(0)

        // Process in parallel
        await Promise.all(initialItems.map(async (itemWrapper, idx) => {
            try {
                const base64 = await imageToBase64(itemWrapper.file)
                const compressed = await compressImage(base64, 600)

                // Update image
                setUploadQueue(prev => prev.map((item, i) =>
                    i === idx ? { ...item, image: compressed } : item
                ))

                // Analyze
                const result = await analyzeClothingImage(compressed)

                // Update analysis
                setUploadQueue(prev => prev.map((item, i) =>
                    i === idx ? { ...item, analysis: result, status: 'done' } : item
                ))
            } catch (err) {
                console.error(`Error processing file ${idx}:`, err)
                const isApiKeyError = err.message === 'MISSING_API_KEY'
                setUploadQueue(prev => prev.map((item, i) =>
                    i === idx ? {
                        ...item,
                        status: 'error',
                        error: isApiKeyError ? 'API Key Missing' : err.message
                    } : item
                ))
            }
        }))
    }, [user])

    const handleFileSelect = (file) => processFiles([file])
    const handleMultiFileSelect = (files) => processFiles(files)

    // Update field for current active item
    const updateActiveItemField = (field, value) => {
        setUploadQueue(prev => prev.map((item, i) =>
            i === activeUploadTab ? { ...item, analysis: { ...item.analysis, [field]: value } } : item
        ))
    }

    const handleSave = useCallback(async () => {
        // Filter for items that are either done or have manual input (if we allow saving errors/manual overrides)
        // For now, let's require status 'done' OR 'error' (if manual fix allowed)
        // Actually, let's just save everything that has an image and basic fields

        // Validation check for the ACTIVE item first (common UI pattern)
        // detailed check for ALL items
        const itemsToSave = uploadQueue.filter(item => item.image)

        if (itemsToSave.length === 0) return

        // Validate all items have category/color
        const missingFields = itemsToSave.filter(item => !item.analysis.category3 || !item.analysis.color)
        if (missingFields.length > 0) {
            // If the ACTIVE item is one of them, show error
            const currentItem = uploadQueue[activeUploadTab]
            if (!currentItem.analysis.category3 || !currentItem.analysis.color) {
                setSaveError('Please select a Category and Color for this item.')
                return
            }
            // If active is fine but others are missing, maybe warn? 
            // For now, let's just try to save valid ones or block?
            // User requested "popup alignment issues fix", so let's be strict but clear.
            alert(`Please select Category and Color for all ${missingFields.length} items before saving.`)
            return
        }

        setSaving(true)
        setSaveError(null)

        try {
            const results = await Promise.allSettled(itemsToSave.map(async (item) => {
                return await saveWardrobeItem({
                    image: item.image,
                    title: item.analysis.title,
                    description: item.analysis.description,
                    ai_description: item.analysis.ai_description,
                    brand: item.analysis.brand,
                    color: item.analysis.color,
                    category: item.analysis.category3,
                    category1: item.analysis.category1,
                    category2: item.analysis.category2,
                    category3: item.analysis.category3,
                    category4: item.analysis.category4,
                    issue: item.analysis.issue
                })
            }))

            const successfulItems = results
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value)

            const failedItems = results.filter(r => r.status === 'rejected')

            if (successfulItems.length > 0) {
                setItems(prev => [...successfulItems, ...prev])
            }

            if (failedItems.length > 0) {
                console.error('Some items failed to save:', failedItems)
                alert(`Failed to save ${failedItems.length} items. Please try again.`)
                // Keep modal open, maybe filter queue to only failed ones?
                // For simplicity/refactor safety: don't close if any failed.
            } else {
                resetForm()
            }

        } catch (err) {
            console.error('Error saving items:', err)
            setSaveError(err.message)
        } finally {
            setSaving(false)
        }
    }, [uploadQueue, activeUploadTab])

    const handleDrop = useCallback((e) => {
        e.preventDefault()
        setDragOver(false)
        const files = e.dataTransfer.files
        if (files.length > 1) {
            handleMultiFileSelect(files)
        } else {
            handleFileSelect(files[0])
        }
    }, [handleFileSelect, handleMultiFileSelect])

    const handleDeleteClick = (id) => {
        setDeleteConfirm(id)
    }

    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteConfirm) return
        try {
            await deleteWardrobeItem(deleteConfirm)
            setItems(prev => prev.filter(item => item.id !== deleteConfirm))
            setDeleteConfirm(null)
        } catch (err) {
            console.error('Error deleting:', err)
            setError('Failed to delete item.')
            setDeleteConfirm(null)
        }
    }, [deleteConfirm])

    const filteredItems = filterCategory === 'all'
        ? items
        : items.filter(item => item.category === filterCategory || item.category3 === filterCategory)

    // Error state
    if (error && !loading) {
        return (
            <div className="container">
                <div className="empty-state" style={{ minHeight: '60vh' }}>
                    <WarningCircle size={48} style={{ color: 'hsl(var(--destructive))' }} />
                    <h3>Something went wrong</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={loadItems}>
                        <ArrowCounterClockwise size={16} /> Try Again
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
                    <h1 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>My Closet</h1>
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
                <h1 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>My Closet</h1>
                <p className="text-muted text-sm">
                    {items.length === 0 ? "Let's build your digital wardrobe" : 'AI auto-detects style & category'}
                </p>
            </div>

            {/* Progress Indicator for new users */}
            {items.length < 3 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))',
                        borderRadius: 'var(--radius-xl)',
                        padding: '1.25rem',
                        marginBottom: '1.25rem',
                        border: '1px solid hsl(var(--primary) / 0.2)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Sparkle size={20} weight="fill" style={{ color: 'hsl(var(--primary))' }} />
                            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Getting Started</span>
                        </div>
                        <span style={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: items.length >= 3 ? 'hsl(var(--green-600))' : 'hsl(var(--primary))'
                        }}>
                            {items.length} / 3 items
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 6, background: 'hsl(var(--border))', borderRadius: 3, marginBottom: '0.75rem' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((items.length / 3) * 100, 100)}%` }}
                            style={{
                                height: '100%',
                                background: items.length >= 3 ? 'hsl(var(--green-500))' : 'hsl(var(--primary))',
                                borderRadius: 3
                            }}
                        />
                    </div>

                    <p style={{
                        fontSize: '0.8125rem',
                        color: 'hsl(var(--muted-foreground))',
                        margin: 0,
                        lineHeight: 1.5
                    }}>
                        {items.length === 0 && "Upload at least 3 items to unlock AI outfit suggestions ✨"}
                        {items.length === 1 && "Great start! Add 2 more to unlock outfit generation 👕"}
                        {items.length === 2 && "Almost there! One more item and you're ready 🎯"}
                    </p>
                </motion.div>
            )}

            {/* Upload Zone - enhanced with camera priority */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`dropzone ${dragOver ? 'dragover' : ''}`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                style={{ marginBottom: '1.5rem', cursor: 'pointer' }}
                onClick={() => {
                    if (!user) {
                        setShowLogin(true)
                    } else {
                        singleFileInputRef.current?.click()
                    }
                }}
            >
                <input
                    ref={singleFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    style={{ display: 'none' }}
                />
                <UploadSimple className="dropzone-icon" />
                <div className="dropzone-text">
                    <h4>{items.length === 0 ? 'Take a photo or upload' : 'Add more clothes'}</h4>
                    <p>AI detects color, style & issues</p>
                </div>
            </motion.div>

            {/* Multi-file upload button */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <label
                    className="btn btn-outline"
                    style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                    onClick={(e) => {
                        if (!user) {
                            e.preventDefault()
                            setShowLogin(true)
                        }
                    }}
                >
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleMultiFileSelect(e.target.files)}
                        style={{ display: 'none' }}
                        onClick={(e) => {
                            if (!user) {
                                e.preventDefault()
                                e.stopPropagation()
                            }
                        }}
                    />
                    <UploadSimple size={16} />
                    Upload Multiple
                </label>
            </div>



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
                    <TShirt className="empty-state-icon" />
                    <h3>Your closet is empty</h3>
                    <p>Upload clothes to get AI-powered styling</p>
                </div>
            ) : (
                <div className="closet-grid">
                    {filteredItems.map((item, idx) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.02 }}
                            style={{
                                background: 'white',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden',
                                border: '1px solid hsl(var(--border))'
                            }}
                        >
                            {/* Image container */}
                            <div style={{ position: 'relative', aspectRatio: '1/1' }}>
                                <img
                                    src={item.image}
                                    alt={item.title || item.category}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                {/* Delete button - top right */}
                                <button
                                    className="btn btn-icon"
                                    style={{
                                        position: 'absolute',
                                        top: '0.5rem',
                                        right: '0.5rem',
                                        background: 'rgba(255, 255, 255, 0.5)',
                                        color: 'hsl(var(--destructive))',
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: 'var(--radius-md)',
                                        backdropFilter: 'blur(4px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => handleDeleteClick(item.id)}
                                >
                                    <Trash size={20} />
                                </button>
                            </div>

                            {/* Info section */}
                            <div style={{ padding: '0.75rem' }}>
                                {/* Title */}
                                <p style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    margin: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {item.title || item.category3 || 'Untitled'}
                                </p>

                                {/* Type & Style */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                                    {item.category3 && (
                                        <span style={{
                                            fontSize: '0.5625rem',
                                            color: 'hsl(var(--muted-foreground))',
                                            background: 'hsl(var(--secondary))',
                                            padding: '0.0625rem 0.25rem',
                                            borderRadius: '3px'
                                        }}>
                                            {item.category3}
                                        </span>
                                    )}
                                    {item.category4 && (
                                        <span style={{
                                            fontSize: '0.5625rem',
                                            color: 'hsl(var(--muted-foreground))',
                                            background: 'hsl(var(--secondary))',
                                            padding: '0.0625rem 0.25rem',
                                            borderRadius: '3px'
                                        }}>
                                            {item.category4}
                                        </span>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        style={{
                                            flex: 1,
                                            padding: '0.5rem',
                                            minHeight: 'unset',
                                            fontSize: '0.6875rem'
                                        }}
                                    >
                                        <PencilSimple size={14} /> Edit
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.5)',
                                zIndex: 1000
                            }}
                            onClick={() => setDeleteConfirm(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: 'white',
                                borderRadius: 'var(--radius-xl)',
                                padding: '1.5rem',
                                width: '90%',
                                maxWidth: '320px',
                                zIndex: 1001,
                                textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🗑️</div>
                            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>Delete this item?</h3>
                            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                                This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    className="btn btn-outline"
                                    style={{ flex: 1 }}
                                    onClick={() => setDeleteConfirm(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        background: 'hsl(var(--destructive))',
                                        color: 'white'
                                    }}
                                    onClick={handleDeleteConfirm}
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}

                {showLogin && (
                    <OnboardingFlow
                        isOpen={showLogin}
                        onClose={() => setShowLogin(false)}
                        onComplete={() => setShowLogin(false)}
                    />
                )}

                {/* Unified Upload Modal */}
                {isUploadModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                            zIndex: 1000, padding: '1rem', overflowY: 'auto', paddingTop: '2rem', paddingBottom: '6rem'
                        }}
                        onClick={() => !saving && resetForm()}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="card"
                            style={{
                                maxWidth: '440px', width: '100%', padding: '0',
                                overflow: 'hidden', boxShadow: 'var(--shadow-2xl)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.75rem 1rem', borderBottom: '1px solid hsl(var(--border))'
                            }}>
                                <div>
                                    <h3 style={{ fontSize: '1rem', margin: 0 }}>Add to Closet</h3>
                                    {uploadQueue.length > 1 && (
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                                            Item {activeUploadTab + 1} of {uploadQueue.length}
                                        </p>
                                    )}
                                </div>
                                <button className="btn btn-icon btn-ghost btn-sm" onClick={resetForm} disabled={saving}>
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Thumbnails (Only if multiple items) */}
                            {uploadQueue.length > 1 && (
                                <div style={{
                                    display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem',
                                    overflowX: 'auto', background: 'hsl(var(--muted))',
                                    borderBottom: '1px solid hsl(var(--border))'
                                }}>
                                    {uploadQueue.map((item, idx) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveUploadTab(idx)}
                                            style={{
                                                position: 'relative',
                                                width: 48, height: 48, flexShrink: 0,
                                                borderRadius: 'var(--radius-md)',
                                                border: idx === activeUploadTab ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                                                overflow: 'hidden', padding: 0, cursor: 'pointer', background: 'white'
                                            }}
                                        >
                                            {item.image ? (
                                                <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <SpinnerGap size={16} className="animate-spin" />
                                                </div>
                                            )}
                                            {/* Status Badge */}
                                            <div style={{
                                                position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%',
                                                background: item.status === 'done' ? 'hsl(var(--green-500))' : item.status === 'error' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                                            }}>
                                                {item.status === 'done' && <Check size={8} weight="bold" />}
                                                {item.status === 'analyzing' && <SpinnerGap size={8} className="animate-spin" />}
                                                {item.status === 'error' && <X size={8} weight="bold" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Content Body */}
                            <div style={{ padding: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
                                {uploadQueue[activeUploadTab] && (() => {
                                    const activeItem = uploadQueue[activeUploadTab];
                                    const isAnalyzing = activeItem.status === 'analyzing';
                                    const analysisData = activeItem.analysis || {};

                                    return (
                                        <>
                                            {/* Main Preview with Status Overlay */}
                                            <div style={{ position: 'relative', aspectRatio: '4/5', maxHeight: '220px', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '1rem', background: 'hsl(var(--muted))', marginInline: 'auto', maxWidth: '200px' }}>
                                                {activeItem.image ? (
                                                    <img src={activeItem.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--muted-foreground))' }}>
                                                        <SpinnerGap size={32} className="animate-spin" />
                                                    </div>
                                                )}

                                                {isAnalyzing && (
                                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'white' }}>
                                                        <SpinnerGap size={28} className="animate-spin" />
                                                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Analyzing...</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Error Message */}
                                            {activeItem.status === 'error' && (
                                                <div style={{ background: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <WarningCircle size={16} />
                                                    {activeItem.error || 'Detection failed'}
                                                </div>
                                            )}

                                            {/* Save Error */}
                                            {saveError && (
                                                <div style={{ background: 'hsl(var(--destructive)/0.1)', color: 'hsl(var(--destructive))', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <WarningCircle size={16} />
                                                    {saveError}
                                                </div>
                                            )}

                                            {/* Form Fields - Disabled while analyzing */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', opacity: isAnalyzing ? 0.6 : 1, pointerEvents: isAnalyzing ? 'none' : 'auto' }}>

                                                {/* Title */}
                                                <div>
                                                    <label className="label" style={{ fontSize: '0.75rem' }}>Title</label>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        value={analysisData.title || ''}
                                                        onChange={(e) => updateActiveItemField('title', e.target.value)}
                                                        placeholder="e.g. Blue Denim Jacket"
                                                    />
                                                </div>

                                                {/* Description */}
                                                <div>
                                                    <label className="label" style={{ fontSize: '0.75rem' }}>Description</label>
                                                    <textarea
                                                        className="input"
                                                        rows={2}
                                                        value={analysisData.description || ''}
                                                        onChange={(e) => updateActiveItemField('description', e.target.value)}
                                                        placeholder="Brief details..."
                                                        style={{ resize: 'none' }}
                                                    />
                                                </div>

                                                {/* Category 3 (Type) */}
                                                <div>
                                                    <label className="label" style={{ fontSize: '0.75rem' }}>Apparel Type *</label>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                                                        {EXISTING_CATEGORY3.map(cat => (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                className={`chip chip-outline ${analysisData.category3 === cat ? 'active' : ''}`}
                                                                onClick={() => updateActiveItemField('category3', cat)}
                                                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                            >
                                                                {CATEGORY_ICONS[cat] || '👔'} {cat}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Color */}
                                                <div>
                                                    <label className="label" style={{ fontSize: '0.75rem' }}>Color *</label>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                                                        {COLORS.map(c => (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onClick={() => updateActiveItemField('color', c.id)}
                                                                style={{
                                                                    width: 28, height: 28, borderRadius: '50%',
                                                                    background: c.hex,
                                                                    border: analysisData.color === c.id ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                                                                    cursor: 'pointer',
                                                                    boxShadow: analysisData.color === c.id ? '0 0 0 2px white' : 'none'
                                                                }}
                                                                title={c.id}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Brand */}
                                                <div>
                                                    <label className="label" style={{ fontSize: '0.75rem' }}>Brand</label>
                                                    <select
                                                        className="input"
                                                        value={analysisData.brand || ''}
                                                        onChange={(e) => updateActiveItemField('brand', e.target.value)}
                                                    >
                                                        <option value="">Select Brand</option>
                                                        {EXISTING_BRANDS.map(b => (
                                                            <option key={b} value={b}>{b}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Detailed Categories (Collapsible or just linear) */}
                                                <div style={{ padding: '0.75rem', background: 'hsl(var(--muted))', borderRadius: 'var(--radius-md)' }}>
                                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, margin: '0 0 0.5rem', opacity: 0.7 }}>Additional Details</p>

                                                    {/* Category 1 (For Whom) */}
                                                    <div style={{ marginBottom: '0.75rem' }}>
                                                        <label className="label" style={{ fontSize: '0.6875rem' }}>For Whom</label>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                            {EXISTING_CATEGORY1.map(cat => (
                                                                <button
                                                                    key={cat} type="button"
                                                                    className={`chip chip-outline ${analysisData.category1 === cat ? 'active' : ''}`}
                                                                    onClick={() => updateActiveItemField('category1', cat)}
                                                                    style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', minHeight: '24px' }}
                                                                >
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {/* Category 2 (Item Type) */}
                                                    <div style={{ marginBottom: '0.75rem' }}>
                                                        <label className="label" style={{ fontSize: '0.6875rem' }}>Item Type</label>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                            {EXISTING_CATEGORY2.map(cat => (
                                                                <button
                                                                    key={cat} type="button"
                                                                    className={`chip chip-outline ${analysisData.category2 === cat ? 'active' : ''}`}
                                                                    onClick={() => updateActiveItemField('category2', cat)}
                                                                    style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', minHeight: '24px' }}
                                                                >
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {/* Category 4 (Style) */}
                                                    <div>
                                                        <label className="label" style={{ fontSize: '0.6875rem' }}>Style</label>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                            {EXISTING_CATEGORY4.map(cat => (
                                                                <button
                                                                    key={cat} type="button"
                                                                    className={`chip chip-outline ${analysisData.category4 === cat ? 'active' : ''}`}
                                                                    onClick={() => updateActiveItemField('category4', cat)}
                                                                    style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', minHeight: '24px' }}
                                                                >
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Footer Buttons */}
                            <div style={{ padding: '1rem', borderTop: '1px solid hsl(var(--border))', display: 'flex', gap: '0.75rem' }}>
                                <button className="btn btn-outline" style={{ flex: 1 }} onClick={resetForm} disabled={saving}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 2 }}
                                    onClick={handleSave}
                                    disabled={saving || uploadQueue.some(i => i.status === 'analyzing')}
                                >
                                    {saving ? (
                                        <><SpinnerGap size={16} className="animate-spin" /> Saving...</>
                                    ) : (
                                        <>{uploadQueue.length > 1 ? `Save All (${uploadQueue.length})` : 'Add to Closet'}</>
                                    )}
                                </button>
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

