import { useState } from 'react'
import { CaretRight, PencilSimple, Warning } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Nested Parameter Selector - displays Color | For Whom | Item Type | Apparel Type
 * in a clickable row. Missing params are highlighted in red.
 */
export default function ParameterSelector({
    color,
    forWhom,
    itemType,
    apparelType,
    onColorChange,
    onForWhomChange,
    onItemTypeChange,
    onApparelTypeChange,
    colorOptions = [],
    forWhomOptions = [],
    itemTypeOptions = [],
    apparelTypeOptions = []
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [activeField, setActiveField] = useState(null)

    const hasAllValues = color && forWhom && itemType && apparelType
    const missingColor = !color
    const missingForWhom = !forWhom
    const missingItemType = !itemType
    const missingApparelType = !apparelType

    const handleOpenField = (field) => {
        setActiveField(field)
        setIsOpen(true)
    }

    // Auto-focus on first missing field
    const handleRowClick = () => {
        if (missingColor) {
            handleOpenField('color')
        } else if (missingForWhom) {
            handleOpenField('forWhom')
        } else if (missingItemType) {
            handleOpenField('itemType')
        } else if (missingApparelType) {
            handleOpenField('apparelType')
        } else {
            setIsOpen(!isOpen)
            setActiveField(null)
        }
    }

    const renderValue = (value, isMissing, label) => (
        <span
            style={{
                color: isMissing ? 'hsl(var(--destructive))' : 'inherit',
                fontWeight: isMissing ? 600 : 500,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
            }}
        >
            {isMissing && <Warning size={12} weight="fill" />}
            {value || label}
        </span>
    )

    return (
        <div style={{ marginBottom: '0.75rem' }}>
            {/* Main Row - Clickable */}
            <div
                onClick={handleRowClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: hasAllValues ? 'hsl(var(--secondary))' : 'hsl(var(--destructive) / 0.08)',
                    border: hasAllValues ? '1px solid hsl(var(--border))' : '1px solid hsl(var(--destructive) / 0.3)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem',
                    flexWrap: 'wrap'
                }}>
                    {renderValue(color, missingColor, 'Color')}
                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>|</span>
                    {renderValue(forWhom, missingForWhom, 'For Whom')}
                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>|</span>
                    {renderValue(itemType, missingItemType, 'Item Type')}
                    <span style={{ color: 'hsl(var(--muted-foreground))' }}>|</span>
                    {renderValue(apparelType, missingApparelType, 'Apparel Type')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'hsl(var(--muted-foreground))' }}>
                    <PencilSimple size={14} weight="bold" />
                    <CaretRight
                        size={14}
                        weight="bold"
                        style={{
                            transform: isOpen ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s'
                        }}
                    />
                </div>
            </div>

            {/* Expandable Edit Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            padding: '0.75rem',
                            background: 'white',
                            border: '1px solid hsl(var(--border))',
                            borderTop: 'none',
                            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)'
                        }}>
                            {/* Field Tabs */}
                            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                {[
                                    { key: 'color', label: 'Color', missing: missingColor },
                                    { key: 'forWhom', label: 'For Whom', missing: missingForWhom },
                                    { key: 'itemType', label: 'Item Type', missing: missingItemType },
                                    { key: 'apparelType', label: 'Apparel Type', missing: missingApparelType }
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveField(tab.key)}
                                        style={{
                                            padding: '0.375rem 0.625rem',
                                            fontSize: '0.6875rem',
                                            fontWeight: activeField === tab.key ? 600 : 400,
                                            background: activeField === tab.key
                                                ? 'hsl(var(--primary))'
                                                : tab.missing
                                                    ? 'hsl(var(--destructive) / 0.1)'
                                                    : 'hsl(var(--secondary))',
                                            color: activeField === tab.key
                                                ? 'white'
                                                : tab.missing
                                                    ? 'hsl(var(--destructive))'
                                                    : 'hsl(var(--foreground))',
                                            border: tab.missing && activeField !== tab.key
                                                ? '1px solid hsl(var(--destructive) / 0.3)'
                                                : '1px solid transparent',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {tab.missing && activeField !== tab.key && <Warning size={10} weight="fill" style={{ marginRight: '0.25rem' }} />}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Options for Active Field */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                {activeField === 'color' && colorOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => onColorChange(opt)}
                                        className={`chip chip-outline ${color === opt ? 'active' : ''}`}
                                        style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '28px' }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                                {activeField === 'forWhom' && forWhomOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => onForWhomChange(opt)}
                                        className={`chip chip-outline ${forWhom === opt ? 'active' : ''}`}
                                        style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '28px' }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                                {activeField === 'itemType' && itemTypeOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => onItemTypeChange(opt)}
                                        className={`chip chip-outline ${itemType === opt ? 'active' : ''}`}
                                        style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '28px' }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                                {activeField === 'apparelType' && apparelTypeOptions.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => onApparelTypeChange(opt)}
                                        className={`chip chip-outline ${apparelType === opt ? 'active' : ''}`}
                                        style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem', minHeight: '28px' }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
