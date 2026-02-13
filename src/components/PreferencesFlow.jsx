import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ArrowRight, X, Loader2, ChevronLeft,
    User, Palette, Shirt, Sparkles, Heart
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { savePreferences } from '../utils/storage'
import { EXISTING_CATEGORY4, EXISTING_COLORS } from '../utils/openaiAnalysis'
import DualRangeSlider from './DualRangeSlider'

// ─── Step definitions ───
const STEPS = {
    NAME: 'name',
    FIT_SIZE: 'fit_size',
    STYLE: 'style',
    COLOR_MATERIAL: 'color_material',
    GENDER_BODY: 'gender_body',
    BUDGET: 'budget',
    SHOPPING_PREF: 'shopping_pref',
    DONE: 'done'
}

const ALL_STEP_ORDER = [
    STEPS.NAME,
    STEPS.FIT_SIZE,
    STEPS.STYLE,
    STEPS.COLOR_MATERIAL,
    STEPS.GENDER_BODY,
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
const BODY_TYPES = ['Slim', 'Athletic', 'Regular', 'Curvy', 'Plus Size']
const GENDERS = ['Women', 'Men', 'Unisex']
const SHOPPING_PREFS = [
    { value: 'new', label: 'Brand New 🛍️', desc: 'fresh off the rack' },
    { value: 'thrifted', label: 'Thrifted ♻️', desc: 'sustainable \u0026 unique' },
    { value: 'both', label: 'Both 🤝', desc: 'best of both worlds' }
]

// ─── Helper: which fields a step covers ───
const STEP_FIELDS = {
    [STEPS.NAME]: ['name'],
    [STEPS.FIT_SIZE]: ['fitType', 'sizes'],
    [STEPS.STYLE]: ['preferredStyles'],
    [STEPS.COLOR_MATERIAL]: ['preferredColors', 'materials'],
    [STEPS.GENDER_BODY]: ['gender', 'bodyType'],
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
    const [fitType, setFitType] = useState([])
    const [sizes, setSizes] = useState([])
    const [preferredStyles, setPreferredStyles] = useState([])
    const [preferredColors, setPreferredColors] = useState([])
    const [materials, setMaterials] = useState([])
    const [gender, setGender] = useState('')
    const [bodyType, setBodyType] = useState('')
    const [budget, setBudget] = useState([500, 5000])
    const [thriftPreference, setThriftPreference] = useState('')

    // Initialize from existing data
    useEffect(() => {
        if (existingProfile?.name) setName(existingProfile.name)
        if (existingPreferences) {
            if (existingPreferences.fitType?.length) setFitType(existingPreferences.fitType)
            if (existingPreferences.sizes?.length) setSizes(existingPreferences.sizes)
            if (existingPreferences.preferredStyles?.length) setPreferredStyles(existingPreferences.preferredStyles)
            if (existingPreferences.preferredColors?.length) setPreferredColors(existingPreferences.preferredColors)
            if (existingPreferences.materials?.length) setMaterials(existingPreferences.materials)
            if (existingPreferences.gender) setGender(existingPreferences.gender)
            if (existingPreferences.bodyType) setBodyType(existingPreferences.bodyType)
            if (existingPreferences.budget) setBudget(existingPreferences.budget)
            if (existingPreferences.thriftPreference) setThriftPreference(existingPreferences.thriftPreference)
        }
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

    // Save everything to user_profiles in the background after each step
    const saveCurrentStep = async () => {
        try {
            // savePreferences already upserts into user_profiles
            const prefs = buildPrefs()
            await savePreferences(prefs)

            // Also save name if set (separate upsert to same table)
            if (name.trim()) {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    await supabase.from('user_profiles').upsert({
                        user_id: user.id,
                        name: name.trim()
                    })
                }
            }
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
        setLoading(true)
        try {
            await savePreferences(buildPrefs())

            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                await supabase.from('user_profiles').upsert({
                    user_id: user.id,
                    ...(name.trim() ? { name: name.trim() } : {}),
                    onboarding_complete: true
                })
            }
            goNext() // goes to DONE step
        } catch (err) {
            console.error('Error saving preferences:', err)
            goNext()
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

                    {/* ─── STEP 2: FIT TYPE + SIZE ─── */}
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

                    {/* ─── STEP 5: GENDER + BODY TYPE ─── */}
                    {currentStep === STEPS.GENDER_BODY && (
                        <motion.div key="gender_body" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step">
                            <div className="prefs-flow-step-body">
                                <div className="prefs-flow-header-section">
                                    <span className="prefs-flow-emoji">🫡</span>
                                    <h1 className="prefs-flow-title">just the basics rn</h1>
                                    <p className="prefs-flow-subtitle">helps us show the right stuff</p>
                                </div>

                                <div className="prefs-flow-section">
                                    <label className="prefs-flow-label">i shop in the</label>
                                    <div className="prefs-flow-radio-group">
                                        {GENDERS.map(g => (
                                            <button
                                                key={g}
                                                className={`prefs-flow-radio-btn ${gender === g ? 'active' : ''}`}
                                                onClick={() => setGender(g)}
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
                                        {BODY_TYPES.map(bt => (
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

                    {/* ─── DONE ─── */}
                    {currentStep === STEPS.DONE && (
                        <motion.div key="done" variants={slideVariants} initial="enter" animate="center" exit="exit" className="prefs-flow-step prefs-flow-done">
                            <div className="prefs-flow-done-content">
                                <motion.div
                                    className="prefs-flow-done-emoji"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                                >
                                    ✨
                                </motion.div>
                                <h1 className="prefs-flow-done-title">
                                    {mode === 'edit' ? 'preferences updated!' : `u're all set${name ? `, ${name.split(' ')[0]}` : ''}!`}
                                </h1>
                                <p className="prefs-flow-done-subtitle">
                                    {mode === 'edit' ? 'your style profile is looking fire 🔥' : 'time to build ur drip 💧'}
                                </p>
                                <button className="prefs-flow-continue-btn prefs-flow-final-cta" onClick={handleComplete}>
                                    {mode === 'edit' ? 'done' : "let's get styled"} <ArrowRight size={16} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </motion.div>
    )
}
