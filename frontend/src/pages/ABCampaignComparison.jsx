import { useState } from 'react'
import { useTranslation } from 'react-i18next'



// --- Mock Data ---

const campaigns = [
  { id: 'c1', name: 'Summer Promo - Video (A)', platform: 'Meta', type: 'Video' },
  { id: 'c2', name: 'Summer Promo - Image (B)', platform: 'Meta', type: 'Image' },
]

const comparisonData = {
  'c1-c2': {
    variantA: {
      id: 'c1',
      name: 'Video Creative',
      spend: 4500,
      impressions: 125000,
      ctr: 1.68,
      cpa: 25.00,
      roas: 2.8,
      conversionRate: 8.57,
      score: 75
    },
    variantB: {
      id: 'c2',
      name: 'Static Image',
      spend: 4200,
      impressions: 98000,
      ctr: 2.50,
      cpa: 17.87,
      roas: 3.5,
      conversionRate: 9.59,
      score: 92
    },
    significance: {
      confidence: 96.5,
      winner: 'variantB',
      verdict: 'Variant B is the clear winner.',
      recommendation: 'It has 28% lower CPA and 25% higher ROAS.'
    },
    trend: [
      { day: 'Day 1', a_cpa: 28, b_cpa: 22, a_ctr: 1.5, b_ctr: 2.1, a_roas: 2.5, b_roas: 3.2 },
      { day: 'Day 2', a_cpa: 26, b_cpa: 20, a_ctr: 1.6, b_ctr: 2.3, a_roas: 2.6, b_roas: 3.3 },
      { day: 'Day 3', a_cpa: 25, b_cpa: 19, a_ctr: 1.7, b_ctr: 2.4, a_roas: 2.7, b_roas: 3.4 },
      { day: 'Day 4', a_cpa: 27, b_cpa: 18, a_ctr: 1.5, b_ctr: 2.6, a_roas: 2.8, b_roas: 3.6 },
      { day: 'Day 5', a_cpa: 24, b_cpa: 17, a_ctr: 1.8, b_ctr: 2.5, a_roas: 2.9, b_roas: 3.5 },
      { day: 'Day 6', a_cpa: 25, b_cpa: 17, a_ctr: 1.7, b_ctr: 2.5, a_roas: 2.8, b_roas: 3.6 },
      { day: 'Day 7', a_cpa: 25, b_cpa: 16, a_ctr: 1.6, b_ctr: 2.6, a_roas: 2.9, b_roas: 3.7 },
    ]
  }
}

// --- Components ---

const MetricCard = ({ label, valueA, valueB, format = 'number', inverse = false }) => {
  const { t } = useTranslation()
  const isAWinner = inverse ? valueA < valueB : valueA > valueB
  const isBWinner = inverse ? valueB < valueA : valueB > valueA
  
  const formatVal = (v) => {
    if (format === 'currency') return `$${Number(v).toFixed(2)}`
    if (format === 'percent') return `${Number(v).toFixed(2)}%`
    return Number(v).toFixed(2)
  }

  // Calculate percentage fill for visual bar
  const maxVal = Math.max(valueA, valueB)
  const widthA = (valueA / maxVal) * 100
  const widthB = (valueB / maxVal) * 100

  return (
    <div className="card glass-card p-5 flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-gray-500 dark:text-gray-400 font-medium text-sm uppercase tracking-wider">{label}</h3>
        {isBWinner ? (
           <span className="badge badge-sm badge-success gap-1 text-white">
             {t('B Won')}
           </span>
        ) : (
           <span className="badge badge-sm badge-primary gap-1 text-white">
             {t('A Won')}
           </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Variant A Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-700 dark:text-gray-300">A</span>
            <span className="font-mono">{formatVal(valueA)}</span>
          </div>
          <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${widthA}%` }}></div>
          </div>
        </div>

        {/* Variant B Bar */}
        <div className="space-y-1">
           <div className="flex justify-between text-sm">
            <span className="font-bold text-gray-700 dark:text-gray-300">B</span>
            <span className="font-mono">{formatVal(valueB)}</span>
          </div>
          <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-pink-500 rounded-full" style={{ width: `${widthB}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-300 text-sm mb-2 font-medium">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm font-semibold mb-1 last:mb-0" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
            <span>{entry.name}:</span>
            <span className="text-gray-700 dark:text-gray-100">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const ABCampaignComparison = () => {
  const { t } = useTranslation()
  const [selectedA, setSelectedA] = useState('c1')
  const [selectedB, setSelectedB] = useState('c2')
  const [trendMetric, setTrendMetric] = useState('cpa')
  const [showDetails, setShowDetails] = useState(false)
  
  const data = comparisonData['c1-c2']
  const { variantA, variantB, significance, trend } = data

  const translatedTrend = trend.map(item => ({ ...item, day: t(item.day) }))

  const getMetricLabel = (m) => {
    if (m === 'cpa') return t('CPA (Cost Per Action)')
    if (m === 'ctr') return t('CTR (Click-Through Rate)')
    if (m === 'roas') return t('ROAS (Return on Ad Spend)')
    return m.toUpperCase()
  }

  return (
    <div className="p-4 max-w-7xl mx-auto pb-20 space-y-8">
      
      {/* 1. Simplified Header */}
      <div className="flex flex-row items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 dark:text-white whitespace-nowrap">
          <FaFlask className="text-purple-500" />
          {t('A/B Comparison')}
        </h1>
        
        {/* Compact Selectors */}
        <div className="flex items-center  p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
           <select 
              className="select select-sm select-ghost w-28 md:w-40 focus:bg-transparent dark:text-gray-200 dark:focus:text-white text-sm"
              value={selectedA}
              onChange={(e) => setSelectedA(e.target.value)}
            >
              {campaigns.map(c => <option key={c.id} value={c.id} className=" dark:text-white">A: {c.name}</option>)}
            </select>
            <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>
            <select 
              className="select select-sm select-ghost w-28 md:w-40 focus:bg-transparent text-right dark:text-gray-200 dark:focus:text-white text-sm"
              value={selectedB}
              onChange={(e) => setSelectedB(e.target.value)}
            >
              {campaigns.map(c => <option key={c.id} value={c.id} className=" dark:text-white">B: {c.name}</option>)}
            </select>
        </div>
      </div>

      {/* 2. The Verdict (Hero Section) */}
      <div className="card bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl overflow-hidden relative">
        <div className="p-8 relative z-10">
          <div className="flex items-center gap-3 mb-2 opacity-90">
             <FaTrophy className="text-yellow-300 text-2xl" />
             <span className="uppercase tracking-widest text-sm font-bold">{t('Recommendation')}</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">{t(significance.verdict)}</h2>
          <p className="text-emerald-50 text-lg opacity-90">{t(significance.recommendation)}</p>
        </div>
        {/* Decorative Circle */}
        <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
      </div>

      {/* 3. Key Battlegrounds (Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          label={t('Cost Efficiency (CPA)')} 
          valueA={variantA.cpa} 
          valueB={variantB.cpa} 
          format="currency" 
          inverse={true} 
        />
        <MetricCard 
          label={t('Return on Spend (ROAS)')} 
          valueA={variantA.roas} 
          valueB={variantB.roas} 
          format="decimal" 
        />
        <MetricCard 
          label={t('Click-Through Rate')} 
          valueA={variantA.ctr} 
          valueB={variantB.ctr} 
          format="percent" 
        />
      </div>

      {/* 4. Performance Trend (Interactive) */}
      <div className="card glass-card p-6">
        <div className="flex flex-row items-center justify-between mb-6 gap-4">
           <h3 className="font-bold text-lg dark:text-white whitespace-nowrap">{t('Performance Over Time')}</h3>
           <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
             {['cpa', 'roas', 'ctr'].map(m => (
               <button 
                 key={m} 
                 className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                   trendMetric === m 
                     ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                     : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                 }`}
                 onClick={() => setTrendMetric(m)}
               >
                 {t(m.toUpperCase())}
               </button>
             ))}
           </div>
        </div>
        
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.3} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
              <Tooltip 
                content={<CustomTooltip />}
              />
              <Legend verticalAlign="top" height={36} />
              <Line 
                type="monotone" 
                dataKey={`a_${trendMetric}`} 
                name={`${t('Variant A')} (${t(trendMetric.toUpperCase())})`} 
                stroke="#3B82F6" 
                strokeWidth={3} 
                dot={false}
                activeDot={{r: 6}}
              />
              <Line 
                type="monotone" 
                dataKey={`b_${trendMetric}`} 
                name={`${t('Variant B')} (${t(trendMetric.toUpperCase())})`} 
                stroke="#EC4899" 
                strokeWidth={3} 
                dot={false} 
                activeDot={{r: 6}}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Detailed Breakdown (Collapsible) */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium hover:text-gray-900 dark:hover:text-white transition-colors mx-auto"
        >
          {showDetails ? t('Hide Detailed Breakdown') : t('Show Detailed Breakdown')}
          {showDetails ? <FaChevronUp /> : <FaChevronDown />}
        </button>

        {showDetails && (
          <div className="mt-6 overflow-x-auto animate-fade-in-down">
            <table className="table w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                  <th>{t('Metric')}</th>
                  <th className="text-right text-blue-500">{t('Variant A')}</th>
                  <th className="text-right text-pink-500">{t('Variant B')}</th>
                  <th className="text-right">{t('Difference')}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: t('Spend'), a: variantA.spend, b: variantB.spend, fmt: (v) => `$${v.toLocaleString()}` },
                  { label: t('Impressions'), a: variantA.impressions, b: variantB.impressions, fmt: (v) => v.toLocaleString() },
                  { label: t('Conversion Rate'), a: variantA.conversionRate, b: variantB.conversionRate, fmt: (v) => `${v}%` },
                  { label: t('Score'), a: variantA.score, b: variantB.score, fmt: (v) => v },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="font-medium">{row.label}</td>
                    <td className="text-right font-mono">{row.fmt(row.a)}</td>
                    <td className="text-right font-mono">{row.fmt(row.b)}</td>
                    <td className="text-right font-bold text-xs">
                      {(((row.b - row.a) / row.a) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

export default ABCampaignComparison