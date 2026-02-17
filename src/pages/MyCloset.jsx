import { useState, useCallback, useEffect, useRef } from 'react'
import { UploadSimple, X, TShirt, Trash, Sparkle, SpinnerGap, WarningCircle, ArrowCounterClockwise, CaretDown, PencilSimple, Check, SignIn, Rows, SquaresFour, Plus, MagicWand } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    getWardrobeItems,
    saveWardrobeItem,
    deleteWardrobeItem,
    imageToBase64,
    compressImage,
    saveRecentOutfit,
    getPreferences
} from '../utils/storage'
import { useNavigate } from 'react-router-dom'
import MissingDataModal from '../components/MissingDataModal'
import { generateTryOn } from '../utils/generateTryOn'
import { useAuth } from '../contexts/AuthContext'
import OnboardingFlow from '../components/OnboardingFlow'
import ImagineMeResultModal from '../components/ImagineMeResultModal'
import {
    analyzeClothingImage,
    EXISTING_COLORS,
    EXISTING_BRANDS,
    EXISTING_CATEGORY1,
    EXISTING_CATEGORY3,
    EXISTING_CATEGORY4,
    CATEGORY_HIERARCHY
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
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()

    // Selection & Try-On State
    const [selectedItems, setSelectedItems] = useState([])
    const [showMissingDataModal, setShowMissingDataModal] = useState(false)
    const [tryOnLoading, setTryOnLoading] = useState(false)
    const [toast, setToast] = useState({ message: '', visible: false })

    // Auto-hide toast
    useEffect(() => {
        if (toast.visible) {
            const timer = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast.visible])

    // Main Closet State
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filterCategory, setFilterCategory] = useState('all')
    const [viewMode, setViewMode] = useState('grid') // 'grid' | 'rows'
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

    // Imagine Me Result State
    const [showImagineModal, setShowImagineModal] = useState(false)
    const [imagineResult, setImagineResult] = useState(null)

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

    // Toggle Selection Mode
    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode)
        setSelectedItems([])
    }

    const handleMagicSelect = () => {
        // Clear current selection
        let newSelection = []
        
        // Helper to get random item from valid items of a category
        const getRandomItem = (category) => {
            const validItems = items.filter(i => i.category3 === category || i.category === category)
            if (validItems.length === 0) return null
            return validItems[Math.floor(Math.random() * validItems.length)]
        }

        // 1. Decide base: Dress/FullBody vs Top+Bottom
        const fullBody = getRandomItem('Full Body')
        const top = getRandomItem('Top')
        const bottom = getRandomItem('Bottom')

        // Prefer Full Body if available and random choice favors it (30% chance or if no top+bottom)
        // Or if we have Top+Bottom, 70% chance to use them.
        let useFullBody = false
        if (fullBody && (!top || !bottom || Math.random() < 0.3)) {
            useFullBody = true
        }

        if (useFullBody && fullBody) {
            newSelection.push(fullBody.id)
        } else if (top && bottom) {
            newSelection.push(top.id)
            newSelection.push(bottom.id)
        } else {
            // Fallback: if we can't make a standard outfit, just pick anything available from top/bottom/fullbody
            if (fullBody) newSelection.push(fullBody.id)
            else if (top) newSelection.push(top.id)
            else if (bottom) newSelection.push(bottom.id)
        }

        // 2. Add Footwear (always try)
        const footwear = getRandomItem('Footwear')
        if (footwear) newSelection.push(footwear.id)

        // 3. Add Accessories (50% chance)
        if (Math.random() < 0.5) {
             const accessory = getRandomItem('Accessories')
             if (accessory) newSelection.push(accessory.id)
        }
        
       // 4. Update selection
       if (newSelection.length > 0) {
           setSelectedItems(newSelection)
       } else {
           setToast({ message: 'Not enough items for a magic outfit', visible: true })
       }
    }

    const handleItemClick = (item) => {
        setSelectedItems(prev => {
            if (prev.includes(item.id)) {
                return prev.filter(id => id !== item.id)
            } else {
                // Check if an item with the same Apparel Type (category3) is already selected
                // Note: item.category3 might be undefined for old items, so we check if it exists
                if (item.category3) {
                    const selectedObjects = items.filter(i => prev.includes(i.id))
                    const duplicateType = selectedObjects.find(i => i.category3 === item.category3)
                    
                    if (duplicateType) {
                        setToast({ 
                            message: `You can't select 2 ${item.category3}s for an outfit`, 
                            visible: true 
                        })
                        return prev
                    }
                }
                return [...prev, item.id]
            }
        })
    }

    // "Imagine Me" Flow
    const handleImagineMeClick = () => {
        // Check profile completeness
        const isProfileComplete = (userProfile?.profile_picture || userProfile?.selfie_url) && userProfile?.body_type && userProfile?.skin_color
        if (!isProfileComplete) {
            setShowMissingDataModal(true)
        } else {
            executeTryOn()
        }
    }

    const executeTryOn = async () => {
        setShowMissingDataModal(false)
        setTryOnLoading(true)
        try {
            const selectedItemObjects = items.filter(i => selectedItems.includes(i.id))
            
            // Generate Image
            const tryOnImageUrl = await generateTryOn(
                {
                    gender: userProfile?.gender || 'woman',
                    age: userProfile?.age,
                    bodyType: userProfile?.body_type,
                    skinColor: userProfile?.skin_color,
                    hairColor: userProfile?.hair_color
                },
                selectedItemObjects,
                userProfile?.profile_picture || userProfile?.selfie_url
            )
            console.log('Try-On Result URL:', tryOnImageUrl)

            // Save Outfit
            const outfit = {
                items: selectedItemObjects,
                mood: 'Try-On',
                description: 'AI Generated Virtual Try-On',
                missing_items: [],
                imagine_on_avatar: tryOnImageUrl
            }

            const saved = await saveRecentOutfit(outfit, {
                thriftPreference: 'both', // defaults
                sizes: [],
                budget: [0, 10000]
            })

            if (saved && saved.id) {
                setImagineResult(saved)
                setShowImagineModal(true)
            } else {
                // Fallback if save returns weird format
                 console.error('Saved outfit format unexpected', saved)
                 alert('Outfit generated but failed to save properly.')
            }

        } catch (error) {
            console.error('Try-On failed:', error)
            alert(`Failed to generate try-on: ${error.message}`)
        } finally {
            setTryOnLoading(false)
            setSelectionMode(false)
            setSelectedItems([])
        }
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
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>My Closet</h1>
                    <p className="text-muted text-sm">
                        {items.length === 0 ? "Let's build your digital wardrobe" : 'Tap items to select for Try-On'}
                    </p>
                </div>
                {/* Header Upload Button (replacing big CTA) */}
                <button 
                    className="btn btn-primary" 
                    onClick={() => {
                        if (!user) setShowLogin(true)
                        else singleFileInputRef.current?.click()
                    }}
                    style={{ gap: '0.5rem', padding: '0.5rem 1rem' }}
                >
                    <Plus size={16} weight="bold" />
                    <span style={{ fontSize: '0.875rem' }}>Add Item</span>
                </button>
                {/* Hidden File Input for Header Button - Updated to Multi-Upload */}
                <input
                    ref={singleFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleMultiFileSelect(e.target.files)}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast.visible && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        style={{
                            position: 'fixed',
                            bottom: '5rem',
                            left: '50%',
                            background: 'hsl(var(--foreground))',
                            color: 'hsl(var(--background))',
                            padding: '0.75rem 1.25rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            boxShadow: 'var(--shadow-lg)',
                            zIndex: 2000,
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {toast.message}
                    </motion.div>
                )}
            </AnimatePresence>

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

            {/* View Toggle & Content */}
            {viewMode === 'grid' ? (
                <>
                    {/* Grid View Filters (Text Only) */}
                    <div style={{ marginBottom: '1rem', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '0.5rem' }}>
                        <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                            <button className={`chip ${filterCategory === 'all' ? 'active' : ''}`} onClick={() => setFilterCategory('all')} style={{ fontSize: '0.75rem', minHeight: '32px' }}>
                                All ({items.length})
                            </button>
                            {EXISTING_CATEGORY3.filter(cat => items.some(i => i.category === cat || i.category3 === cat)).map(cat => (
                                <button
                                    key={cat}
                                    className={`chip ${filterCategory === cat ? 'active' : ''}`}
                                    onClick={() => setFilterCategory(cat)}
                                    style={{ fontSize: '0.75rem', minHeight: '32px' }}
                                >
                                    {cat} ({items.filter(i => i.category === cat || i.category3 === cat).length})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Closet Grid */}
                    {filteredItems.length === 0 ? (
                        <div className="empty-state">
                            <TShirt className="empty-state-icon" />
                            <h3>No items found</h3>
                            <p>Try changing filters or upload new clothes</p>
                        </div>
                    ) : (
                        <div className="closet-grid">
                            {filteredItems.map((item, idx) => (
                                <ItemCard 
                                    key={item.id} 
                                    item={item} 
                                    idx={idx} 
                                    selectedItems={selectedItems} 
                                    handleItemClick={handleItemClick} 
                                    handleDeleteClick={handleDeleteClick} 
                                />
                            ))}
                        </div>
                    )}
                </>
            ) : (
                /* Rows View */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem' }}>
                    {EXISTING_CATEGORY3.map(cat => {
                        const catItems = items.filter(i => i.category === cat || i.category3 === cat)
                        return (
                            <div key={cat} style={{ overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingLeft: '0.25rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{cat}</h3>
                                    <span style={{ fontSize: '0.875rem', color: 'hsl(var(--muted-foreground))' }}>({catItems.length})</span>
                                </div>
                                
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '0.75rem', 
                                    overflowX: 'auto', 
                                    padding: '0 0.25rem 1rem',
                                    scrollSnapType: 'x mandatory'
                                }}>
                                    {catItems.map((item, idx) => (
                                        <div key={item.id} style={{ scrollSnapAlign: 'start', flexShrink: 0, width: '140px' }}>
                                            <ItemCard 
                                                item={item} 
                                                idx={idx} 
                                                selectedItems={selectedItems} 
                                                handleItemClick={handleItemClick} 
                                                handleDeleteClick={handleDeleteClick} 
                                                compact
                                            />
                                        </div>
                                    ))}
                                    
                                    {/* Add Button at end of row */}
                                    <button
                                        style={{
                                            scrollSnapAlign: 'start',
                                            flexShrink: 0,
                                            width: '60px',
                                            height: '140px', // Mathcing reduced card height roughly or centered
                                            alignSelf: 'center', // Vertically center in the row
                                            borderRadius: 'var(--radius-lg)',
                                            border: '2px dashed hsl(var(--border))',
                                            background: 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'hsl(var(--muted-foreground))',
                                            cursor: 'pointer',
                                            flexDirection: 'column',
                                            gap: '0.25rem'
                                        }}
                                        onClick={() => {
                                             if (!user) setShowLogin(true)
                                             else {
                                                 // Ideally we pre-select the category, but straightforward upload is fine for now
                                                 singleFileInputRef.current?.click()
                                             }
                                        }}
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* View Toggle FAB - Only show when NO items selected */}
            <AnimatePresence>
                {selectedItems.length === 0 && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setViewMode(prev => prev === 'grid' ? 'rows' : 'grid')}
                        style={{
                            position: 'fixed',
                            bottom: '90px', // Above nav bar (approx 66px) + 24px margin
                            left: '1.5rem', // Left aligned
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'white', 
                            color: 'black',
                            border: '1px solid #e5e7eb',
                            boxShadow: 'var(--shadow-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 100,
                            cursor: 'pointer'
                        }}
                    >
                        {viewMode === 'grid' ? <Rows size={24} weight="fill" /> : <SquaresFour size={24} weight="fill" />}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Magic Wand FAB - Opposite to Toggle, SAME height */}
            <AnimatePresence>
                {selectedItems.length === 0 && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleMagicSelect}
                        style={{
                            position: 'fixed',
                            bottom: '90px', 
                            right: '1.5rem', // Right aligned
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            color: 'white',
                            border: 'none',
                            boxShadow: '0 4px 14px 0 rgba(168, 85, 247, 0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 100,
                            cursor: 'pointer'
                        }}
                    >
                        <MagicWand size={24} weight="fill" />
                    </motion.button>
                )}
            </AnimatePresence>

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
                
                {/* Floating Action Bar for Selection (Imagine Me) - Replaces Toggle when items selected */}
                <AnimatePresence>
                    {selectedItems.length > 0 && (
                        <motion.div
                            initial={{ y: 20, opacity: 0, x: '-50%' }}
                            animate={{ y: 0, opacity: 1, x: '-50%' }}
                            exit={{ y: 20, opacity: 0, x: '-50%' }}
                            style={{
                                position: 'fixed',
                                bottom: '90px', // Same position as Toggle FAB
                                left: '50%',
                                zIndex: 900,
                                display: 'flex',
                                gap: '0.75rem',
                                background: 'hsl(var(--card))',
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-full)',
                                boxShadow: 'var(--shadow-xl)',
                                border: '1px solid hsl(var(--border))',
                                alignItems: 'center'
                            }}
                        >
                            <button
                                onClick={() => setSelectedItems([])}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'hsl(var(--muted-foreground))',
                                    padding: '0.25rem',
                                    marginRight: '0.25rem',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title="Clear selection"
                            >
                                <X size={16} weight="bold" />
                            </button>

                            <span style={{ fontSize: '0.875rem', fontWeight: 600, marginRight: '0.5rem' }}>
                                {selectedItems.length} selected
                            </span>
                            
                            <button 
                                className="btn btn-primary"
                                onClick={handleImagineMeClick}
                                disabled={tryOnLoading}
                                style={{ display: 'flex', items: 'center', gap: '0.5rem' }}
                            >
                                {tryOnLoading ? <SpinnerGap className="animate-spin" /> : <Sparkle weight="fill" />}
                                Imagine Me
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <MissingDataModal 
                    isOpen={showMissingDataModal} 
                    onClose={() => setShowMissingDataModal(false)}
                    onUpdateProfile={() => navigate('/profile')}
                    onProceed={executeTryOn}
                />

                <ImagineMeResultModal
                    isOpen={showImagineModal}
                    onClose={() => setShowImagineModal(false)}
                    outfit={imagineResult}
                />

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

                                                {/* Category 1 (For Whom) - Moved here */}
                                                <div>
                                                    <label className="label" style={{ fontSize: '0.75rem' }}>For Whom</label>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                        {EXISTING_CATEGORY1.map(cat => (
                                                            <button
                                                                key={cat} type="button"
                                                                className={`chip chip-outline ${analysisData.category1 === cat ? 'active' : ''}`}
                                                                onClick={() => updateActiveItemField('category1', cat)}
                                                                style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '28px' }}
                                                            >
                                                                {cat}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Category 3 (Apparel Type) */}
                                                <div>
                                                    <label className="label" style={{ fontSize: '0.75rem' }}>Apparel Type *</label>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                                                        {EXISTING_CATEGORY3.map(cat => (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                className={`chip chip-outline ${analysisData.category3 === cat ? 'active' : ''}`}
                                                                onClick={() => {
                                                                    // Reset Item Type when Apparel Type changes
                                                                    updateActiveItemField('category3', cat)
                                                                    updateActiveItemField('category2', '')
                                                                }}
                                                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                            >
                                                                {CATEGORY_ICONS[cat] || '👔'} {cat}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Category 2 (Item Type) - Dynamic based on Apparel Type */}
                                                {analysisData.category3 && CATEGORY_HIERARCHY[analysisData.category3] && (
                                                    <div className="animate-in fade-in slide-in-from-top-1">
                                                        <label className="label" style={{ fontSize: '0.75rem' }}>Item Type *</label>
                                                        <div style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                                                            gap: '0.25rem'
                                                        }}>
                                                            {CATEGORY_HIERARCHY[analysisData.category3].map(cat => (
                                                                <button
                                                                    key={cat} type="button"
                                                                    className={`chip chip-outline ${analysisData.category2 === cat ? 'active' : ''}`}
                                                                    onClick={() => updateActiveItemField('category2', cat)}
                                                                    style={{ 
                                                                        fontSize: '0.6875rem', 
                                                                        padding: '0.25rem 0.5rem', 
                                                                        minHeight: '28px',
                                                                        justifyContent: 'center' 
                                                                    }}
                                                                >
                                                                    {cat}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

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

                                                {/* Category 4 (Style) */}
                                                <div>
                                                    <label className="label" style={{ fontSize: '0.75rem' }}>Style</label>
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

function ItemCard({ item, idx, selectedItems, handleItemClick, handleDeleteClick, compact }) {
    const isSelected = selectedItems.includes(item.id)
    
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.02 }}
            style={{
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                border: isSelected 
                    ? '2px solid hsl(var(--primary))' 
                    : '1px solid hsl(var(--border))',
                position: 'relative',
                cursor: 'pointer',
                transform: isSelected ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.2s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                minWidth: compact ? '140px' : 'auto'
            }}
            onClick={() => handleItemClick(item)}
        >
            {/* Selected Check Mark */}
            <div style={{
                position: 'absolute',
                top: compact ? '0.25rem' : '0.5rem',
                left: compact ? '0.25rem' : '0.5rem',
                width: compact ? '20px' : '24px',
                height: compact ? '20px' : '24px',
                borderRadius: '50%',
                background: isSelected ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.7)',
                border: isSelected ? '1px solid hsl(var(--border))' : '2px solid hsl(var(--muted-foreground))',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                transition: 'all 0.2s ease'
            }}>
                {isSelected && <Check size={compact ? 12 : 14} weight="bold" />}
            </div>
            
            {/* Image container */}
            <div style={{ position: 'relative', aspectRatio: '3/4' }}>
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
                        top: compact ? '0.25rem' : '0.5rem',
                        right: compact ? '0.25rem' : '0.5rem',
                        background: 'rgba(255, 255, 255, 0.5)',
                        color: 'hsl(var(--destructive))',
                        width: compact ? '32px' : '40px',
                        height: compact ? '32px' : '40px',
                        borderRadius: 'var(--radius-md)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick(item.id)
                    }}
                >
                    <Trash size={compact ? 16 : 20} />
                </button>
            </div>

            {/* Info section */}
            <div style={{ padding: compact ? '0.5rem' : '0.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Title */}
                <p style={{
                    fontSize: compact ? '0.6875rem' : '0.75rem',
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
                    {!compact && item.category4 && (
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
                {!compact && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                        <button
                            className="btn btn-outline btn-sm"
                            style={{
                                flex: 1,
                                padding: '0.5rem',
                                minHeight: 'unset',
                                fontSize: '0.6875rem'
                            }}
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                        >
                            <PencilSimple size={14} /> Edit
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

