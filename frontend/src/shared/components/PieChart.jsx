import { useEffect, useRef, useState } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
ChartJS.register(ArcElement, Tooltip, Legend)

export const PieChart = ({
  percentage = 2,
  segments = [],
  centerValue,
  centerValueSuffix,
  centerLabel,
  size = 160,
  centerLabelPosition = 'below', // 'above' | 'below'
  subLabel,
  primaryColor,
  secondaryColor,
  cutout = '70%',
  spacing = 0,
  borderRadius = 0,
  centerValueClass,
  centerLabelClass,
  subLabelClass,
  // inner track ring (for screenshot-style double ring)
  innerTrack = true,
  innerTrackRadius = '92%',
  innerTrackCutout = '86%',
  innerTrackColor,
  // animate center value count-up when numeric
  animateCenterCountUp = false,
  centerValueDuration = 700
}) => {
  const isDark = document.documentElement.classList.contains('dark')

  const data = segments && segments.length > 0
    ? {
        labels: segments.map(s => s.label),
        datasets: [
          {
            data: segments.map(s => s.value),
            backgroundColor: segments.map(s => s.color),
            borderColor: isDark ? '#111827' : '#ffffff',
            borderWidth: isDark ? 1 : 0,
            cutout,
            hoverOffset: 6,
            spacing: 2,
            borderRadius
          }
        ]
      }
    : {
        labels: ['Completed', 'Remaining'],
        datasets: [
          // Inner track ring for visual baseline
          ...(innerTrack ? [{
            data: [100],
            backgroundColor: [innerTrackColor || (isDark ? '#3f4a5a' : '#cbd5e1')],
            borderColor: isDark ? '#111827' : '#ffffff',
            borderWidth: 0,
            hoverOffset: 0,
            spacing: 0,
            radius: innerTrackRadius,
            cutout: innerTrackCutout
          }] : []),
          // Outer main ring
          {
            data: [percentage, 100 - percentage],
            backgroundColor: [primaryColor || '#2dd4bf', secondaryColor || (isDark ? '#475569' : '#e5e7eb')],
            borderColor: isDark ? '#111827' : '#ffffff',
            borderWidth: 0,
            cutout,
            hoverOffset: 6,
            spacing,
            borderRadius,
            radius: '100%'
          }
        ]
      }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 2,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const pct = total ? Math.round((value / total) * 100) : 0
            return `${context.label}: ${value} (${pct}%)`
          }
        }
      }
    },
    animation: {
      animateRotate: true,
      animateScale: true
    }
  }

  function CountUp({ value, duration }) {
    const [display, setDisplay] = useState(value)
    const prev = useRef(value)
    useEffect(() => {
      if (typeof value !== 'number') { setDisplay(value); return }
      const from = typeof prev.current === 'number' ? prev.current : 0
      const to = value
      prev.current = to
      const start = performance.now()
      const step = (ts) => {
        const p = Math.min(1, (ts - start) / duration)
        const v = Math.round(from + (to - from) * p)
        setDisplay(v)
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, [value, duration])
    return <span>{display}</span>
  }

  return (
    <div className="relative flex items-center justify-center">
      <div style={{ width: size, height: size }}>
        <Doughnut data={data} options={options} />
      </div>
      {(centerValue !== undefined || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerLabel && centerLabelPosition === 'above' && (
            <div className="text-xs text-[var(--muted-text)] mb-1">{centerLabel}</div>
          )}
          {centerValue !== undefined && (
            <div className={centerValueClass || "text-2xl font-bold flex items-baseline gap-1"}>
              {animateCenterCountUp && typeof centerValue === 'number'
                ? <CountUp value={centerValue} duration={centerValueDuration} />
                : <span>{centerValue}</span>}
              {centerValueSuffix && <span className="text-xs opacity-70">{centerValueSuffix}</span>}
            </div>
          )}
          {centerLabel && centerLabelPosition !== 'above' && (
            <div className={centerLabelClass || "text-xs text-[var(--muted-text)] mt-1"}>{centerLabel}</div>
          )}
          {subLabel && (
            <div className={subLabelClass || "text-[10px] text-[var(--muted-text)] mt-0.5"}>{subLabel}</div>
          )}
        </div>
      )}
    </div>
  )
}
