import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@shared/context/ThemeProvider'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export default function LeadSourcePerformanceChart({ sources, height = 260, stacked = true, horizontal = false, showLeads = true, showConverted = true, subtitle = 'Last 30 Days', normalize = false }) {
  const { t } = useTranslation()
  const { theme, resolvedTheme } = useTheme()
  const labels = sources?.map(s => s.source) || ['Facebook', 'Google Ads', 'Referral', 'Email']
  const leads = sources?.map(s => s.leads) || [500, 300, 150, 100]
  const converted = sources?.map(s => s.converted) || [120, 110, 80, 40]

  // For visualization: remaining = total - converted
  const convertedClamped = converted.map((c, idx) => Math.min(c, leads[idx]))
  const remaining = leads.map((l, idx) => Math.max(0, l - (convertedClamped[idx] || 0)))
  const convertedPercent = leads.map((l, idx) => l > 0 ? (convertedClamped[idx] / l) * 100 : 0)
  const remainingPercent = leads.map((l, idx) => l > 0 ? ((l - convertedClamped[idx]) / l) * 100 : 0)
  const isDark = resolvedTheme === 'dark'
  const tickColor = isDark ? '#e5e7eb' : '#374151'

  const datasets = []
  if (showLeads) {
    datasets.push({
      label: t('Unconverted'),
      data: normalize ? remainingPercent : remaining,
      backgroundColor: 'rgba(99, 102, 241, 0.85)',
      borderRadius: 6,
      stack: stacked ? 'leads' : undefined,
      order: 1,
    })
  }
  if (showConverted) {
    datasets.push({
      label: t('Converted'),
      data: normalize ? convertedPercent : convertedClamped,
      backgroundColor: 'rgba(14, 165, 233, 0.7)',
      borderRadius: 6,
      stack: stacked ? 'leads' : undefined,
      order: 2,
    })
  }

  const data = { labels, datasets }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor, font: { size: 12 } }, stacked },
      y: { grid: { display: false }, ticks: { color: tickColor, font: { size: 12, }, callback: normalize ? (val) => `${val}%` : undefined }, stacked, min: 0, max: normalize ? 100 : undefined }
    },
    plugins: {
      legend: { display: true, labels: { color: tickColor } },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (items) => labels[items[0].dataIndex],
          beforeBody: (items) => {
            const idx = items[0].dataIndex
            return `${t('Total Leads')}: ${leads[idx].toLocaleString()}`
          },
          label: (ctx) => {
            const idx = ctx.dataIndex
            const total = leads[idx]
            if (ctx.dataset.label === t('Converted')) {
              const conv = convertedClamped[idx]
              const convP = total > 0 ? (conv / total) * 100 : 0
              return `${t('Converted')}: ${conv.toLocaleString()} (${convP.toFixed(1)}%)`
            }
            const rem = remaining[idx]
            const remP = total > 0 ? (rem / total) * 100 : 0
            return `${t('Unconverted')}: ${rem.toLocaleString()} (${remP.toFixed(1)}%)`
          },
          footer: (items) => {
            const idx = items[0].dataIndex
            const total = leads[idx]
            const conv = convertedClamped[idx]
            const rate = total > 0 ? (conv / total) * 100 : 0
            return `${t('Conversion Rate')}: ${rate.toFixed(1)}%`
          }
        }
      }
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text">{t('Lead Source Performance')}</h3>
      <div style={{ height: typeof height === 'number' ? `${height}px` : height }}>
        <Bar data={data} options={options} />
      </div>
      <div className="mt-3 text-xs text-[var(--muted-text)] dark:text-blue-200">{t(subtitle)}</div>
    </div>
  )
}