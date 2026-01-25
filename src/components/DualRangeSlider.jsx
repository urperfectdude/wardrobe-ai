import { useState, useEffect, useRef } from 'react'

/**
 * Dual Range Slider Component
 * Creates a slider with two handles for selecting a range
 */
export default function DualRangeSlider({
    min = 0,
    max = 20000,
    step = 500,
    value = [0, 10000],
    onChange,
    formatValue = (val) => `₹${val.toLocaleString()}`
}) {
    const [minVal, setMinVal] = useState(value[0])
    const [maxVal, setMaxVal] = useState(value[1])
    const minValRef = useRef(value[0])
    const maxValRef = useRef(value[1])
    const range = useRef(null)

    // Convert to percentage
    const getPercent = (val) => Math.round(((val - min) / (max - min)) * 100)

    // Update range fill when values change
    useEffect(() => {
        const minPercent = getPercent(minVal)
        const maxPercent = getPercent(maxValRef.current)

        if (range.current) {
            range.current.style.left = `${minPercent}%`
            range.current.style.width = `${maxPercent - minPercent}%`
        }
    }, [minVal, min, max])

    useEffect(() => {
        const minPercent = getPercent(minValRef.current)
        const maxPercent = getPercent(maxVal)

        if (range.current) {
            range.current.style.width = `${maxPercent - minPercent}%`
        }
    }, [maxVal, min, max])

    // Sync with external value changes
    useEffect(() => {
        if (value[0] !== minVal) setMinVal(value[0])
        if (value[1] !== maxVal) setMaxVal(value[1])
    }, [value])

    const handleMinChange = (e) => {
        const newMin = Math.min(Number(e.target.value), maxVal - step)
        setMinVal(newMin)
        minValRef.current = newMin
        onChange?.([newMin, maxVal])
    }

    const handleMaxChange = (e) => {
        const newMax = Math.max(Number(e.target.value), minVal + step)
        setMaxVal(newMax)
        maxValRef.current = newMax
        onChange?.([minVal, newMax])
    }

    return (
        <div className="dual-range-container">
            <div className="dual-range-values">
                <span className="dual-range-value">{formatValue(minVal)}</span>
                <span className="dual-range-separator">—</span>
                <span className="dual-range-value">{formatValue(maxVal)}{maxVal >= max ? '+' : ''}</span>
            </div>

            <div className="dual-range-slider">
                {/* Track */}
                <div className="dual-range-track" />

                {/* Filled Range */}
                <div ref={range} className="dual-range-fill" />

                {/* Min Thumb */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={minVal}
                    onChange={handleMinChange}
                    className="dual-range-thumb dual-range-thumb--min"
                    style={{ zIndex: minVal > max - 100 ? 5 : 3 }}
                />

                {/* Max Thumb */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={maxVal}
                    onChange={handleMaxChange}
                    className="dual-range-thumb dual-range-thumb--max"
                />
            </div>
        </div>
    )
}
