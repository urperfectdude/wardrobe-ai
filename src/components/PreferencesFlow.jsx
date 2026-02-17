import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowRight, X, Loader2, ChevronLeft,
    User, Palette, Shirt, Sparkles, Heart, Camera, Upload
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { savePreferences, uploadImageToStorage, compressImage } from '../utils/storage'
import { EXISTING_CATEGORY4, EXISTING_COLORS } from '../utils/openaiAnalysis'
import { createGeminiVisionCompletion, isGeminiConfigured } from '../lib/gemini'
import DualRangeSlider from './DualRangeSlider'

// ─── Step definitions ───
const STEPS = {
    NAME: 'name',
    USERNAME: 'username',
    SELFIE: 'selfie',
    APPEARANCE: 'appearance',
    AGE_GENDER_BODY: 'age_gender_body',
    FIT_SIZE: 'fit_size',
    STYLE: 'style',
    COLOR_MATERIAL: 'color_material',
    BUDGET: 'budget',
    SHOPPING_PREF: 'shopping_pref',
    DONE: 'done'
}

const ALL_STEP_ORDER = [
    STEPS.NAME,
    STEPS.USERNAME,
    STEPS.SELFIE,
    STEPS.APPEARANCE,
    STEPS.AGE_GENDER_BODY,
    STEPS.FIT_SIZE,
    STEPS.STYLE,
    STEPS.COLOR_MATERIAL,
    STEPS.BUDGET,
    STEPS.SHOPPING_PREF,
    STEPS.DONE
]

// ─── Option data ───
const FIT_TYPES = ['Slim', 'Regular', 'Relaxed', 'Oversized', 'Loose', 'Athletic']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

const STYLE_OPTIONS = EXISTING_CATEGORY4.map(s => ({
    name: s,
    emoji: {
        'Indie': '🎸', 'Cottagecore': '🌿', 'Y2K': '💿', 'Clean Girl': '🧴',
        'Old Money': '🏛️', 'Streetwear': '🛹', 'Coquette': '🎀', 'Grunge': '⛓️',
        'Minimalist': '◻️', 'Boho': '🪶', 'Athleisure': '🏃', 'Dark Academia': '📚',
        'Light Academia': '☕', 'Coastal': '🌊', 'Preppy': '🎾', 'Baddie': '🔥',
        'Soft Girl': '🌸', 'E-Girl': '🖤', 'Ethnic/Traditional': '🪷',
        'Whimsical': '🦋', 'Office Siren': '💼', 'Casual': '👟', 'Formal': '👔', 'Party': '🪩'
    }[s] || '✨'
}))

const COLOR_OPTIONS = [
    { name: 'Black', hex: '#1a1a1a' }, { name: 'White', hex: '#ffffff' },
    { name: 'Navy', hex: '#1e3a5f' }, { name: 'Beige', hex: '#d4c5b0' },
    { name: 'Gray', hex: '#6b7280' }, { name: 'Brown', hex: '#8B4513' },
    { name: 'Pink', hex: '#ec4899' }, { name: 'Red', hex: '#ef4444' },
    { name: 'Blue', hex: '#3b82f6' }, { name: 'Green', hex: '#22c55e' },
    { name: 'Yellow', hex: '#eab308' }, { name: 'Purple', hex: '#a855f7' },
    { name: 'Orange', hex: '#f97316' }, { name: 'Teal', hex: '#14b8a6' },
    { name: 'Coral', hex: '#fb7185' }, { name: 'Maroon', hex: '#881337' }
]

const MATERIALS = ['Cotton', 'Polyester', 'Silk', 'Denim', 'Wool', 'Linen', 'Leather', 'Velvet', 'Satin', 'Rayon', 'Nylon']
const BODY_TYPES_BY_GENDER = {
    'Women': ['Slim', 'Athletic', 'Pear', 'Hourglass', 'Apple', 'Rectangle', 'Plus Size'],
    'Men': ['Slim', 'Athletic', 'Regular', 'Broad', 'Plus Size'],
    'Unisex': ['Slim', 'Athletic', 'Regular', 'Curvy', 'Plus Size']
}
const BODY_TYPES = ['Slim', 'Athletic', 'Regular', 'Curvy', 'Plus Size']
const GENDERS = ['Women', 'Men', 'Unisex']
const SHOPPING_PREFS = [
    { value: 'new', label: 'Brand New 🛍️', desc: 'fresh off the rack' },
    { value: 'thrifted', label: 'Thrifted ♻️', desc: 'sustainable & unique' },
    { value: 'both', label: 'Both 🤝', desc: 'best of both worlds' }
]

const SKIN_COLORS = [
    { name: 'Fair', hex: '#FDEBD0' },
    { name: 'Light', hex: '#F5CBA7' },
    { name: 'Medium', hex: '#D4A574' },
    { name: 'Tan', hex: '#C68642' },
    { name: 'Brown', hex: '#8D5524' },
    { name: 'Dark', hex: '#5C3317' }
]

const HAIR_COLORS = [
    { name: 'Black', hex: '#1a1a1a' },
    { name: 'Dark Brown', hex: '#3B2F2F' },
    { name: 'Brown', hex: '#8B4513' },
    { name: 'Light Brown', hex: '#A0522D' },
    { name: 'Blonde', hex: '#D4A76A' },
    { name: 'Red', hex: '#B7410E' },
    { name: 'Auburn', hex: '#A52A2A' },
    { name: 'Gray', hex: '#808080' },
    { name: 'White', hex: '#E8E8E8' }
]

// ─── Helper: which fields a step covers ───
const STEP_FIELDS = {
    [STEPS.NAME]: ['name'],
    [STEPS.USERNAME]: ['username'],
    [STEPS.SELFIE]: ['selfieUrl'],
    [STEPS.APPEARANCE]: ['skinColor', 'hairColor'],
    [STEPS.AGE_GENDER_BODY]: ['age', 'gender', 'bodyType'],
    [STEPS.FIT_SIZE]: ['fitType', 'sizes'],
    [STEPS.STYLE]: ['preferredStyles'],
    [STEPS.COLOR_MATERIAL]: ['preferredColors', 'materials'],
    [STEPS.BUDGET]: ['budget'],
    [STEPS.SHOPPING_PREF]: ['thriftPreference'],
}

function isFieldEmpty(val) {
    if (val === null || val === undefined || val === '') return true
    if (Array.isArray(val) && val.length === 0) return true
    if (Array.isArray(val) && val.length === 2 && val[0] === 500 && val[1] === 5000) return true // default budget
    return false
}

// Check which steps have incomplete fields
export function getIncompleteSteps(preferences, profile) {
    const steps = []
    if (!profile?.name) steps.push(STEPS.NAME)

    for (const [step, fields] of Object.entries(STEP_FIELDS)) {
        if (step === STEPS.NAME) continue
        const allEmpty = fields.every(f => isFieldEmpty(preferences?.[f]))
        if (allEmpty) steps.push(step)
    }
    return steps
}

// ─── Main Component ───
export default function PreferencesFlow({
    isOpen,
    onClose,
    onComplete,
    existingPreferences = null,
    existingProfile = null,
    incompleteFields = null, // array of step keys, or null for all
    mode = 'onboarding' // 'onboarding' | 'edit'
}) {
    const [loading, setLoading] = useState(false)

    // Build step order based on incomplete fields or show all
    const [stepOrder, setStepOrder] = useState([])
    const [currentStepIdx, setCurrentStepIdx] = useState(0)

    // Form data
    const [name, setName] = useState('')
    const [username, setUsername] = useState('')
    const [selfieFile, setSelfieFile] = useState(null)
    const [selfiePreview, setSelfiePreview] = useState('')
    const [selfieUrl, setSelfieUrl] = useState('')
    const [skinColor, setSkinColor] = useState('')
    const [hairColor, setHairColor] = useState('')
    const [age, setAge] = useState('')
    const [uploading, setUploading] = useState(false)
    const [analyzingSelfie, setAnalyzingSelfie] = useState(false)
    const [fitType, setFitType] = useState([])
    const [sizes, setSizes] = useState([])
    const [preferredStyles, setPreferredStyles] = useState([])
    const [preferredColors, setPreferredColors] = useState([])
    const [materials, setMaterials] = useState([])
    const [gender, setGender] = useState('')
    const [bodyType, setBodyType] = useState('')
    const [budget, setBudget] = useState([500, 5000])
    const [thriftPreference, setThriftPreference] = useState('')
    const fileInputRef = useRef(null)

    // Initialize from existing data
    // Initialize from existing data
    useEffect(() => {
        // Prefer existingPreferences (normalized & fresh) over existingProfile (raw & potential stale context)
        const src = existingPreferences || {}
        const profile = existingProfile || {}

        if (src.name || profile.name) setName(src.name || profile.name)
        if (src.username || profile.username) setUsername(src.username || profile.username)
        
        // Images
        const pic = src.selfieUrl || src.profilePicture || profile.profile_picture || profile.selfie_url
        if (pic) { 
            setSelfieUrl(pic)
            setSelfiePreview(pic) 
        }
        
        // Appearance
        if (src.skinColor || profile.skin_color) setSkinColor(src.skinColor || profile.skin_color)
        if (src.hairColor || profile.hair_color) setHairColor(src.hairColor || profile.hair_color)
        if (src.age || profile.age) setAge(src.age || profile.age)
        
        // Shopping Prefs
        if (src.fitType?.length) setFitType(src.fitType)
        if (src.sizes?.length) setSizes(src.sizes)
        if (src.preferredStyles?.length) setPreferredStyles(src.preferredStyles)
        if (src.preferredColors?.length) setPreferredColors(src.preferredColors)
        if (src.materials?.length) setMaterials(src.materials)
        if (src.gender || profile.gender) setGender(src.gender || profile.gender)
        if (src.bodyType || profile.body_type) setBodyType(src.bodyType || profile.body_type)
        if (src.budget) setBudget(src.budget)
        if (src.thriftPreference || profile.shopping_choice) setThriftPreference(src.thriftPreference || profile.shopping_choice)

    }, [existingPreferences, existingProfile])

    // Build step order
    useEffect(() => {
        if (incompleteFields && incompleteFields.length > 0) {
            setStepOrder([...incompleteFields, STEPS.DONE])
        } else {
            setStepOrder([...ALL_STEP_ORDER])
        }
        setCurrentStepIdx(0)
    }, [incompleteFields])

    const currentStep = stepOrder[currentStepIdx] || STEPS.DONE

    // Handle selfie file selection
    const handleSelfieSelect = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setSelfieFile(file)
        const reader = new FileReader()
        reader.onload = (ev) => setSelfiePreview(ev.target.result)
        reader.readAsDataURL(file)
    }

    // Analyze selfie with Gemini Vision
    const analyzeSelfie = async (base64) => {
        if (!isGeminiConfigured()) return null
        setAnalyzingSelfie(true)
        try {
            const result = await createGeminiVisionCompletion({
                systemPrompt: `You are a fashion AI assistant. Analyze the person's selfie photo and extract their approximate skin tone and hair color. Return ONLY valid JSON like: {"skin_color": "Fair|Light|Medium|Tan|Brown|Dark", "hair_color": "Black|Dark Brown|Brown|Light Brown|Blonde|Red|Auburn|Gray|White"}`,
                userPrompt: 'Analyze this selfie and determine the skin tone and hair color of the person. Return JSON only.',
                imageBase64: base64,
                maxTokens: 200,
                temperature: 0.1
            })
            const cleaned = result.replace(/```json\n?|```\n?/g, '').trim()
            // Robust extract JSON if extra text exists
            const jsonStart = cleaned.indexOf('{')
            const jsonEnd = cleaned.lastIndexOf('}')
            const jsonString = (jsonStart !== -1 && jsonEnd !== -1) 
                ? cleaned.substring(jsonStart, jsonEnd + 1) 
                : cleaned
            
            const parsed = JSON.parse(jsonString)
            console.log('Gemini Analysis Result:', parsed) // Log for debugging
            if (parsed.skin_color) setSkinColor(parsed.skin_color)
            if (parsed.hair_color) setHairColor(parsed.hair_color)
            return parsed
        } catch (err) {
            console.error('Selfie analysis failed:', err)
            return null
        } finally {
            setAnalyzingSelfie(false)
        }
    }

    // Upload selfie and trigger analysis
    const handleSelfieNext = async () => {
        if (selfieFile && selfiePreview) {
            setUploading(true)
            try {
                // Compress and upload
                const compressed = await compressImage(selfiePreview, 600)
                const url = await uploadImageToStorage(compressed)
                setSelfieUrl(url) // Update state
                setUploading(false)

                // Trigger AI analysis
                const analysisResult = await analyzeSelfie(compressed)
                
                // Explicitly save the FRESH values to DB immediately
                // We only save the fields relevant to this step (Selfie + Analysis)
                const prefsToSave = {
                    selfieUrl: url,
                    skinColor: analysisResult?.skin_color || skinColor,
                    hairColor: analysisResult?.hair_color || hairColor
                }
                
                console.log('Saving fresh selfie data:', prefsToSave)
                await savePreferences(prefsToSave)

                // Manually move to next step (skipping goNext's default saveCurrentStep which has stale state)
                setCurrentStepIdx(prev => prev + 1)
                
            } catch (err) {
                console.error('Selfie upload/analysis failed:', err)
                setUploading(false)
                // Fallback: just move next if it fails
                setCurrentStepIdx(prev => prev + 1)
            }
        } else {
            goNext()
        }
    }

    // Build current prefs object from state
    const buildPrefs = () => ({
        thriftPreference: thriftPreference || 'both',
        sizes,
        preferredColors,
        budget,
        fitType,
        preferredStyles,
        materials,
        bodyType,
        gender
    })

    // Validate username format
    const isValidUsername = (u) => /^[a-zA-Z0-9_]{3,20}$/.test(u)

    // Save ONLY the fields for the current step
    const saveCurrentStep = async () => {
        try {
            const currentStepName = stepOrder[currentStepIdx]
            const fieldsToSave = STEP_FIELDS[currentStepName]

            if (!fieldsToSave) return

            // Construct partial prefs object
            const allPrefs = buildPrefs()
            // Add identity/appearance fields manually since buildPrefs only does Shopping prefs
            allPrefs.name = name
            allPrefs.username = username
            allPrefs.skinColor = skinColor
            allPrefs.hairColor = hairColor
            allPrefs.age = age
            allPrefs.selfieUrl = selfieUrl

            const partialPrefs = {}
            fieldsToSave.forEach(field => {
                if (allPrefs[field] !== undefined) {
                    partialPrefs[field] = allPrefs[field]
                }
            })

            console.log(`Saving step ${currentStepName}:`, partialPrefs)
            await savePreferences(partialPrefs)
        } catch (err) {
            console.error('Background save failed:', err)
        }
    }

    const goNext = () => {
        if (currentStepIdx < stepOrder.length - 1) {
            saveCurrentStep() // fire-and-forget save
            setCurrentStepIdx(prev => prev + 1)
        }
    }

    const goBack = () => {
        if (currentStepIdx > 0) {
            setCurrentStepIdx(prev => prev - 1)
        }
    }

    const handleSkip = () => {
        goNext()
    }

    const toggleInArray = (arr, setArr, value) => {
        setArr(prev =>
            prev.includes(value)
                ? prev.filter(v => v !== value)
                : [...prev, value]
        )
    }

    const handleFinalSave = async () => {
        console.log('handleFinalSave: Starting')
        setLoading(true)
        
        try {
            // Create a timeout promise that rejects after 15 seconds
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Operation timed out. Please check your internet connection and try again.')), 15000)
            })

            // The actual save operation
            const saveOperation = async () => {
                // Save the final steps data (Shopping Preferences + Budget etc)
                // We assume previous steps saved their data incrementally
                // But to be safe, we can save all "Shopping" preferences now
                // ALSO mark onboarding as complete here to avoid a second DB call
                const prefs = buildPrefs()
                prefs.onboardingComplete = true 
                
                console.log('handleFinalSave: Saving final prefs', prefs)
                
                await savePreferences(prefs)
                console.log('handleFinalSave: Preferences saved')
                
                return true
            }

            // Race the save operation against the timeout
            const user = await Promise.race([saveOperation(), timeoutPromise])
            
            console.log('handleFinalSave: Done, moving next')
            
            console.log('handleFinalSave: Done, moving next')
            
            // User requested to close the flow immediately after saving
            handleComplete()
        } catch (err) {
            console.error('Error saving preferences:', err)
            alert(`Error saving: ${err.message}`)
            // Optional: still allow proceeding if it's just a network timeout on the final status update
            // goNext() 
        } finally {
            setLoading(false)
        }
    }

    const handleComplete = () => {
        onComplete?.()
        onClose()
    }

    if (!isOpen) return null

    const slideVariants = {
        enter: { x: 60, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -60, opacity: 0 }
    }

    // Progress (exclude DONE from count)
    const totalSteps = stepOrder.filter(s => s !== STEPS.DONE).length
    const currentProgress = Math.min(currentStepIdx, totalSteps)
    const progressPercent = totalSteps > 0 ? (currentProgress / totalSteps) * 100 : 0

    // Check if current step is the last preference step (before DONE)
    const isLastPrefStep = currentStepIdx === stepOrder.length - 2 && currentStep !== STEPS.DONE

    const stepNumber = currentStepIdx + 1

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="prefs-flow-overlay"
        >
            {/* Header */}
            <div className="prefs-flow-header">
                {currentStep !== STEPS.DONE ? (
                    <button onClick={currentStepIdx > 0 ? goBack : onClose} className="prefs-flow-back-btn">
                        <ChevronLeft size={20} />
                    </button>
                ) : <div style={{ width: 36 }} />}

                {/* Progress Bar */}
                {currentStep !== STEPS.DONE && (
                    <div className="prefs-flow-progress-track">
                        <motion.div
                            className="prefs-flow-progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                    </div>
                )}

                {currentStep !== STEPS.DONE && (
                    <span className="prefs-flow-step-count">{stepNumber}/{totalSteps}</span>
                )}

                <button onClick={onClose} className="prefs-flow-close-btn">
                    <X size={18} />
                </button>
            </div>

            {/* Content */}
            <div className="prefs-flow-content">
                <AnimatePresence mode="wait">

                    {/* ─── STEP 1: NAME ─── */}
                    {currentStep === STEPS.NAME && (
                        <motion.div key="name" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body">
                                <div className="prefs-flow-header-section">
                                    <span className="prefs-flow-emoji">💅</span>
                                    <h1 className="prefs-flow-title">what should we call u?</h1>
                                    <p className="prefs-flow-subtitle">let's make this personal bestie</p>
                                </div>
                                <input
                                    type="text"
                                    className="prefs-flow-text-input"
                                    placeholder="e.g. Priya, Arjun, Kai..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="prefs-flow-actions">
                                <button className="prefs-flow-skip-btn" onClick={handleSkip}>skip for now</button>
                                <button className="prefs-flow-continue-btn" onClick={goNext} disabled={!name.trim()}>
                                    continue <ArrowRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── STEP 1.5: USERNAME ─── */}
                    {currentStep === STEPS.USERNAME && (
                        <motion.div key="username" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body">
                                <div className="prefs-flow-header-section">
                                    <span className="prefs-flow-emoji">🏷️</span>
                                    <h1 className="prefs-flow-title">pick a username</h1>
                                    <p className="prefs-flow-subtitle">unique to u, 3+ chars</p>
                                </div>
                                <input
                                    type="text"
                                    className="prefs-flow-text-input"
                                    placeholder="e.g. fashion_killa"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                    autoFocus
                                />
                                {!isValidUsername(username) && username.length > 0 && (
                                    <p style={{ color: 'hsl(var(--destructive))', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                                        Must be 3-20 chars, letters/numbers/underscore only
                                    </p>
                                )}
                            </div>
                            <div className="prefs-flow-actions">
                                <button className="prefs-flow-continue-btn" onClick={goNext} disabled={!isValidUsername(username)}>
                                    continue <ArrowRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                    {/* ─── STEP 2: SELFIE UPLOAD ─── */}
                    {currentStep === STEPS.SELFIE && (
                        <motion.div key="selfie" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body">
                                <div className="prefs-flow-header-section">
                                    <span className="prefs-flow-emoji">📸</span>
                                    <h1 className="prefs-flow-title">show us that face!</h1>
                                    <p className="prefs-flow-subtitle">helps AI match colors to ur skin & hair</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                    {selfiePreview ? (
                                        <div style={{
                                            width: '160px', height: '160px', borderRadius: '50%',
                                            overflow: 'hidden', border: '3px solid hsl(var(--primary))',
                                            boxShadow: '0 0 0 4px hsl(var(--primary) / 0.15)'
                                        }}>
                                            <img src={selfiePreview} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                width: '160px', height: '160px', borderRadius: '50%',
                                                border: '2px dashed hsl(var(--border))',
                                                background: 'hsl(var(--muted) / 0.5)',
                                                display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                gap: '0.5rem', cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Camera size={32} style={{ color: 'hsl(var(--muted-foreground))' }} />
                                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>tap to upload</span>
                                        </button>
                                    )}

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        capture="user"
                                        onChange={handleSelfieSelect}
                                        style={{ display: 'none' }}
                                    />

                                    {selfiePreview && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="prefs-flow-skip-btn"
                                            style={{ fontSize: '0.8rem' }}
                                        >
                                            retake photo
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="prefs-flow-actions">
                                <button className="prefs-flow-skip-btn" onClick={handleSkip}>skip for now</button>
                                <button className="prefs-flow-continue-btn" onClick={handleSelfieNext} disabled={analyzingSelfie || uploading}>
                                    {uploading ? <><Loader2 size={16} className="animate-spin" /> uploading...</> : 
                                     analyzingSelfie ? <><Loader2 size={16} className="animate-spin" /> analyzing...</> : 
                                     <>continue <ArrowRight size={16} /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── STEP 3: APPEARANCE (SKIN & HAIR) ─── */}
                    {currentStep === STEPS.APPEARANCE && (
                        <motion.div key="appearance" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body">
                                <div className="prefs-flow-header-section">
                                    <span className="prefs-flow-emoji">🎨</span>
                                    <h1 className="prefs-flow-title">{skinColor || hairColor ? 'we detected these!' : 'tell us about u'}</h1>
                                    <p className="prefs-flow-subtitle">{skinColor || hairColor ? 'feel free to adjust if needed' : 'helps us find ur best colors'}</p>
                                </div>

                                <div className="prefs-flow-section">
                                    <label className="prefs-flow-label">skin tone</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {SKIN_COLORS.map(sc => (
                                            <button
                                                key={sc.name}
                                                onClick={() => setSkinColor(sc.name)}
                                                style={{
                                                    width: '52px', height: '52px', borderRadius: '50%',
                                                    background: sc.hex,
                                                    border: skinColor === sc.name ? '3px solid hsl(var(--primary))' : '2px solid hsl(var(--border))',
                                                    boxShadow: skinColor === sc.name ? '0 0 0 3px hsl(var(--primary) / 0.2)' : 'none',
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                                                    paddingBottom: '4px'
                                                }}
                                            >
                                                <span style={{ fontSize: '0.55rem', color: ['Fair', 'Light'].includes(sc.name) ? '#666' : '#fff', fontWeight: 600 }}>{sc.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="prefs-flow-section">
                                    <label className="prefs-flow-label">hair color</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {HAIR_COLORS.map(hc => (
                                            <button
                                                key={hc.name}
                                                onClick={() => setHairColor(hc.name)}
                                                style={{
                                                    width: '52px', height: '52px', borderRadius: '50%',
                                                    background: hc.hex,
                                                    border: hairColor === hc.name ? '3px solid hsl(var(--primary))' : '2px solid hsl(var(--border))',
                                                    boxShadow: hairColor === hc.name ? '0 0 0 3px hsl(var(--primary) / 0.2)' : 'none',
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                                                    paddingBottom: '4px'
                                                }}
                                            >
                                                <span style={{ fontSize: '0.5rem', color: ['Blonde', 'Gray', 'White'].includes(hc.name) ? '#333' : '#fff', fontWeight: 600 }}>{hc.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="prefs-flow-actions">
                                <button className="prefs-flow-skip-btn" onClick={handleSkip}>skip for now</button>
                                <button className="prefs-flow-continue-btn" onClick={isLastPrefStep ? handleFinalSave : goNext} disabled={loading}>
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>continue <ArrowRight size={16} /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── STEP 4: AGE + GENDER + BODY TYPE ─── */}
                    {currentStep === STEPS.AGE_GENDER_BODY && (
                        <motion.div key="age_gender_body" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body">
                                <div className="prefs-flow-header-section">
                                    <span className="prefs-flow-emoji">🫡</span>
                                    <h1 className="prefs-flow-title">just the basics rn</h1>
                                    <p className="prefs-flow-subtitle">helps us show the right stuff</p>
                                </div>

                                <div className="prefs-flow-section">
                                    <label className="prefs-flow-label">age</label>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                                        <button
                                            onClick={() => setAge(prev => Math.max(13, (parseInt(prev) || 20) - 1))}
                                            style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                border: '2px solid hsl(var(--border))', background: 'hsl(var(--muted))',
                                                fontSize: '1.25rem', cursor: 'pointer', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >−</button>
                                        <input
                                            type="number"
                                            value={age}
                                            onChange={(e) => setAge(e.target.value)}
                                            placeholder="20"
                                            style={{
                                                width: '80px', textAlign: 'center', fontSize: '1.5rem',
                                                fontWeight: 700, border: '2px solid hsl(var(--border))',
                                                borderRadius: 'var(--radius-lg)', padding: '0.5rem',
                                                background: 'hsl(var(--card))', color: 'hsl(var(--foreground))'
                                            }}
                                        />
                                        <button
                                            onClick={() => setAge(prev => Math.min(100, (parseInt(prev) || 20) + 1))}
                                            style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                border: '2px solid hsl(var(--border))', background: 'hsl(var(--muted))',
                                                fontSize: '1.25rem', cursor: 'pointer', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >+</button>
                                    </div>
                                </div>

                                <div className="prefs-flow-section">
                                    <label className="prefs-flow-label">i shop in the</label>
                                    <div className="prefs-flow-radio-group">
                                        {GENDERS.map(g => (
                                            <button
                                                key={g}
                                                className={`prefs-flow-radio-btn ${gender === g ? 'active' : ''}`}
                                                onClick={() => { setGender(g); setBodyType('') }}
                                            >
                                                <div className={`prefs-flow-radio-circle ${gender === g ? 'filled' : ''}`} />
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="prefs-flow-section">
                                    <label className="prefs-flow-label">body type</label>
                                    <div className="prefs-flow-radio-group">
                                        {(BODY_TYPES_BY_GENDER[gender] || BODY_TYPES).map(bt => (
                                            <button
                                                key={bt}
                                                className={`prefs-flow-radio-btn ${bodyType === bt ? 'active' : ''}`}
                                                onClick={() => setBodyType(bt)}
                                            >
                                                <div className={`prefs-flow-radio-circle ${bodyType === bt ? 'filled' : ''}`} />
                                                {bt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="prefs-flow-actions">
                                <button className="prefs-flow-skip-btn" onClick={handleSkip}>skip for now</button>
                                <button className="prefs-flow-continue-btn" onClick={isLastPrefStep ? handleFinalSave : goNext} disabled={loading}>
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>continue <ArrowRight size={16} /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── STEP 5: FIT TYPE + SIZE ─── */}
                    {currentStep === STEPS.FIT_SIZE && (
                        <motion.div key="fit_size" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body">
                                <div className="prefs-flow-header-section">
                                    <span className="prefs-flow-emoji">🤌</span>
                                    <h1 className="prefs-flow-title">how do u like ur fits?</h1>
                                    <p className="prefs-flow-subtitle">pick all that vibe with u</p>
                                </div>

                                <div className="prefs-flow-section">
                                    <label className="prefs-flow-label">fit type</label>
                                    <div className="prefs-flow-chip-grid">
                                        {FIT_TYPES.map(fit => (
                                            <button
                                                key={fit}
                                                className={`prefs-flow-chip ${fitType.includes(fit) ? 'active' : ''}`}
                                                onClick={() => toggleInArray(fitType, setFitType, fit)}
                                            >
                                                {fit}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="prefs-flow-section">
                                    <label className="prefs-flow-label">your size</label>
                                    <div className="prefs-flow-chip-grid">
                                        {SIZES.map(size => (
                                            <button
                                                key={size}
                                                className={`prefs-flow-chip chip-compact ${sizes.includes(size) ? 'active' : ''}`}
                                                onClick={() => toggleInArray(sizes, setSizes, size)}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="prefs-flow-actions">
                                <button className="prefs-flow-skip-btn" onClick={handleSkip}>skip for now</button>
                                <button className="prefs-flow-continue-btn" onClick={isLastPrefStep ? handleFinalSave : goNext} disabled={loading}>
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>continue <ArrowRight size={16} /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── STEP 3: STYLE VIBES ─── */}
                    {currentStep === STEPS.STYLE && (
                        <motion.div key="style" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body">
                                <div className="prefs-flow-header-section">
                                    <span className="prefs-flow-emoji">✨</span>
                                    <h1 className="prefs-flow-title">pick ur aesthetic bestie</h1>
                                    <p className="prefs-flow-subtitle">
                                        select all the vibes u fw • {preferredStyles.length} selected
                                    </p>
                                </div>

                                <div className="prefs-flow-style-grid">
                                    {STYLE_OPTIONS.map(style => (
                                        <button
                                            key={style.name}
                                            className={`prefs-flow-style-card ${preferredStyles.includes(style.name) ? 'active' : ''}`}
                                            onClick={() => toggleInArray(preferredStyles, setPreferredStyles, style.name)}
                                        >
                                            <span className="prefs-flow-style-emoji">{style.emoji}</span>
                                            <span className="prefs-flow-style-label">{style.name}</span>
                                            {preferredStyles.includes(style.name) && (
                                                <motion.div
                                                    className="prefs-flow-style-check"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                >
                                                    ✓
                                                </motion.div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="prefs-flow-actions">
                                <button className="prefs-flow-skip-btn" onClick={handleSkip}>skip for now</button>
                                <button className="prefs-flow-continue-btn" onClick={isLastPrefStep ? handleFinalSave : goNext} disabled={loading}>
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>continue <ArrowRight size={16} /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── STEP 4: COLORS + MATERIALS ─── */}
                    {currentStep === STEPS.COLOR_MATERIAL && (
                        <motion.div key="color_material" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body">
                                <div className="prefs-flow-header-section">
                                    <span className="prefs-flow-emoji">🎨</span>
                                    <h1 className="prefs-flow-title">colors that scream you</h1>
                                    <p className="prefs-flow-subtitle">and fabrics u love to wear</p>
                                </div>

                                <div className="prefs-flow-section">
                                    <label className="prefs-flow-label">favourite colors</label>
                                    <div className="prefs-flow-color-grid">
                                        {COLOR_OPTIONS.map(color => (
                                            <button
                                                key={color.name}
                                                className={`prefs-flow-color-swatch ${preferredColors.includes(color.name) ? 'active' : ''}`}
                                                style={{ '--swatch-color': color.hex }}
                                                onClick={() => toggleInArray(preferredColors, setPreferredColors, color.name)}
                                                title={color.name}
                                            >
                                                {preferredColors.includes(color.name) && (
                                                    <span className="prefs-flow-color-check" style={{ color: ['White', 'Beige', 'Yellow'].includes(color.name) ? '#333' : 'white' }}>✓</span>
                                                )}
                                                <span className="prefs-flow-color-name">{color.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="prefs-flow-section">
                                    <label className="prefs-flow-label">preferred materials</label>
                                    <div className="prefs-flow-chip-grid">
                                        {MATERIALS.map(mat => (
                                            <button
                                                key={mat}
                                                className={`prefs-flow-chip ${materials.includes(mat) ? 'active' : ''}`}
                                                onClick={() => toggleInArray(materials, setMaterials, mat)}
                                            >
                                                {mat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="prefs-flow-actions">
                                <button className="prefs-flow-skip-btn" onClick={handleSkip}>skip for now</button>
                                <button className="prefs-flow-continue-btn" onClick={isLastPrefStep ? handleFinalSave : goNext} disabled={loading}>
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>continue <ArrowRight size={16} /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}



                    {/* ─── STEP 6: BUDGET ─── */}
                    {currentStep === STEPS.BUDGET && (
                        <motion.div key="budget" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body">
                                <div className="prefs-flow-header-section">
                                    <span className="prefs-flow-emoji">💸</span>
                                    <h1 className="prefs-flow-title">what's the budget sitch?</h1>
                                    <p className="prefs-flow-subtitle">per item, no judgement here bestie</p>
                                </div>

                                <div className="prefs-flow-budget-wrapper">
                                    <DualRangeSlider
                                        min={0}
                                        max={20000}
                                        step={500}
                                        value={budget}
                                        onChange={setBudget}
                                    />
                                </div>

                                <div className="prefs-flow-budget-labels">
                                    <span className="prefs-flow-budget-tag">💰 thrift-friendly</span>
                                    <span className="prefs-flow-budget-tag">💎 splurge worthy</span>
                                </div>
                            </div>
                            <div className="prefs-flow-actions">
                                <button className="prefs-flow-skip-btn" onClick={handleSkip}>skip for now</button>
                                <button className="prefs-flow-continue-btn" onClick={isLastPrefStep ? handleFinalSave : goNext} disabled={loading}>
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>continue <ArrowRight size={16} /></>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── STEP 7: SHOPPING PREFERENCE ─── */}
                    {currentStep === STEPS.SHOPPING_PREF && (
                        <motion.div key="shopping_pref" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body">
                                <div className="prefs-flow-header-section">
                                    <span className="prefs-flow-emoji">♻️</span>
                                    <h1 className="prefs-flow-title">thrift queen or brand new?</h1>
                                    <p className="prefs-flow-subtitle">we don't judge, just curate 💅</p>
                                </div>

                                <div className="prefs-flow-shopping-options">
                                    {SHOPPING_PREFS.map(pref => (
                                        <button
                                            key={pref.value}
                                            className={`prefs-flow-shopping-card ${thriftPreference === pref.value ? 'active' : ''}`}
                                            onClick={() => setThriftPreference(pref.value)}
                                        >
                                            <span className="prefs-flow-shopping-label">{pref.label}</span>
                                            <span className="prefs-flow-shopping-desc">{pref.desc}</span>
                                            {thriftPreference === pref.value && (
                                                <motion.div
                                                    className="prefs-flow-shopping-check"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                >
                                                    ✓
                                                </motion.div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="prefs-flow-actions">
                                <button className="prefs-flow-skip-btn" onClick={handleSkip}>skip for now</button>
                                <button className="prefs-flow-continue-btn prefs-flow-finish-btn" onClick={handleFinalSave} disabled={loading}>
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <>
                                        {mode === 'edit' ? 'save & close' : "let's gooo"} <Sparkles size={16} />
                                    </>}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── STEP: DONE ─── */}
                    {currentStep === STEPS.DONE && (
                        <motion.div key="done" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body" style={{ alignItems: 'center', textAlign: 'center' }}>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 12 }}
                                    style={{ 
                                        width: '80px', height: '80px', borderRadius: '50%', 
                                        background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: '1.5rem', fontSize: '2.5rem'
                                    }}
                                >
                                    🎉
                                </motion.div>
                                <h1 className="prefs-flow-title">you're all set!</h1>
                                <p className="prefs-flow-subtitle">we've customized everything just for u.</p>
                                
                                <div style={{ 
                                    marginTop: '2rem', padding: '1.5rem', 
                                    background: 'hsl(var(--muted) / 0.5)', borderRadius: 'var(--radius-lg)',
                                    maxWidth: '300px', width: '100%'
                                }}>
                                    <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Next steps:</p>
                                    <ul style={{ textAlign: 'left', fontSize: '0.85rem', paddingLeft: '1.5rem', color: 'hsl(var(--muted-foreground))' }}>
                                        <li style={{ marginBottom: '0.25rem' }}>Upload your digital closet</li>
                                        <li style={{ marginBottom: '0.25rem' }}>Generate outfits with AI</li>
                                        <li>Share your fits with the world</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="prefs-flow-actions">
                                <button className="prefs-flow-continue-btn" onClick={handleComplete}>
                                    start styling <Sparkles size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </motion.div>
    )
}
