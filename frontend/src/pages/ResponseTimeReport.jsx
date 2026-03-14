import { useState, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { 
  FaClock, FaBolt, FaExclamationTriangle, FaChartLine, FaCalendarAlt, FaDownload, FaTrophy 
} from 'react-icons/fa'

// --- Mock Data Generators ---

const generateTrendData = (days, t) => {
  return Array.from({ length: days }, (_, i) => ({
    day: `${t('Day')} ${i + 1}`,
    avgTime: Math.floor(Math.random() * 15) + 5, // 5-20 mins
    conversion: Math.floor(Math.random() * 20) + 10 // 10-30%
  }))
}

const generateKPIs = (range, t) => {
  const multiplier = range === '7d' ? 0.9 : range === '30d' ? 1 : 1.1;
  return {
    avgResponse: { 
      value: `${Math.floor(8 * multiplier)}m ${Math.floor(42 * multiplier)}s`, 
      trend: range === '7d' ? 'up' : 'down', 
      subtext: range === '7d' ? `↑ 5% ${t('vs last week')}` : `↓ 12% ${t('vs last month')}` 
    },
    within5Min: { value: `${Math.floor(68 / multiplier)}%`, trend: range === '7d' ? 'down' : 'up' },
    conversionLift: { value: `+${Math.floor(15 * multiplier)}%` },
    missedOpps: { value: Math.floor(42 * multiplier) }
  }
}

const generateBottlenecks = (range, t) => {
  const hourlyBottlenecks = [
    { hour: '9 AM', time: 5, load: 'Low' },
    { hour: '10 AM', time: 8, load: 'Med' },
    { hour: '11 AM', time: 12, load: 'High' },
    { hour: '12 PM', time: 25, load: 'Critical' }, // Lunch break spike
    { hour: '1 PM', time: 18, load: 'High' },
    { hour: '2 PM', time: 10, load: 'Med' },
    { hour: '3 PM', time: 7, load: 'Low' },
    { hour: '4 PM', time: 6, load: 'Low' },
    { hour: '5 PM', time: 15, load: 'High' }, // End of day rush
  ]
  return hourlyBottlenecks.map(b => ({
    ...b,
    load: t(b.load), // Translate load status
    time: Math.floor(b.time * (range === '7d' ? 0.8 : range === '90d' ? 1.2 : 1))
  }))
}

const generateImpactData = (range, t) => {
  const impactData = [
    { time: '< 5 min', conversion: 25, leads: 450 },
    { time: '5-15 min', conversion: 15, leads: 320 },
    { time: '15-60 min', conversion: 8, leads: 150 },
    { time: '1-24 hrs', conversion: 2, leads: 80 },
    { time: '> 24 hrs', conversion: 0.5, leads: 20 },
  ]
  return impactData.map(d => ({
    ...d,
    time: t(d.time), // Translate time label
    conversion: Math.floor(d.conversion * (range === '7d' ? 1.1 : 0.9)),
    leads: Math.floor(d.leads * (range === '7d' ? 0.25 : range === '90d' ? 3 : 1))
  }))
}

const generateAgents = (range, t) => {
  const multiplier = range === '7d' ? 1 : range === '30d' ? 1.2 : 1.5
  return [
    { name: 'Sarah Ahmed', avgTime: `${Math.floor(3 * multiplier)}m`, score: 98, status: 'Top Performer' },
    { name: 'Mohamed Ali', avgTime: `${Math.floor(7 * multiplier)}m`, score: 85, status: 'Good' },
    { name: 'Omar Khaled', avgTime: `${Math.floor(12 * multiplier)}m`, score: 72, status: 'Needs Improvement' },
    { name: 'Nour El-Din', avgTime: `${Math.floor(25 * multiplier)}m`, score: 45, status: 'Critical' },
  ]
}

// --- Components ---

const KPICard = ({ title, value, subtext, icon: Icon, color, trend }) => (
  <div className="card glass-card p-5 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
      <Icon className={`text-6xl text-${color}-500`} />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
          <Icon className="text-xl" />
        </div>
        <h3 className="font-medium  dark:text-white text-sm">{title}</h3>
      </div>
      <div className="text-3xl font-bold dark:text-white mb-1">{value}</div>
      <div className={`text-xs font-medium flex items-center gap-1 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : ''}`}>
        {subtext}
      </div>
    </div>
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white  p-3 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700">
        <p className="text-gray-900 dark:text-white text-sm mb-2 font-medium">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm font-semibold mb-1 last:mb-0" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full " style={{ backgroundColor: entry.color }}></span>
            <span>{entry.name}:</span>
            <span className="text-gray-900 dark:text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const ResponseTimeReport = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState('30d')
  const printRef = useRef(null)
  
  const isRTL = i18n.language === 'ar';

  // Dynamic Data based on Time Range
  const trendData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 14 : 30 // Reduced points for 30/90d for cleaner chart
    return generateTrendData(days, t)
  }, [timeRange, t])

  const currentAgents = useMemo(() => generateAgents(timeRange, t), [timeRange, t])
  const kpiData = useMemo(() => generateKPIs(timeRange, t), [timeRange, t])
  const hourlyData = useMemo(() => generateBottlenecks(timeRange, t), [timeRange, t])
  const impactStats = useMemo(() => generateImpactData(timeRange, t), [timeRange, t])

  const handleExport = async () => {
    if (!printRef.current) return

    try {
      console.log('Starting export...')
      const element = printRef.current
      const bodyStyle = window.getComputedStyle(document.body)
      let bgColor = bodyStyle.backgroundColor
      if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
        bgColor = '#ffffff'
      }

      console.log('Generating image with html-to-image...')
      const dataUrl = await toPng(element, {
        backgroundColor: bgColor,
        cacheBust: true,
        filter: (node) => {
          // Ignore elements with data-html2canvas-ignore attribute
          // html-to-image doesn't have a built-in attribute ignore like html2canvas
          // so we implement a custom filter
          if (node.hasAttribute && node.hasAttribute('data-html2canvas-ignore')) {
            return false
          }
          return true
        }
      })

      console.log('Image generated, creating PDF...')
      
      // Calculate dimensions before creating PDF
      const img = new Image()
      img.src = dataUrl
      
      // Wait for image to load to get dimensions (though dataUrl is usually immediate, good practice)
      img.onload = () => {
        const imgWidth = img.width
        const imgHeight = img.height
        
        // A4 width in points (approx)
        const pdfWidth = 595.28
        const ratio = pdfWidth / imgWidth
        const pdfHeight = imgHeight * ratio
        
        const pdf = new jsPDF({
          orientation: pdfHeight > pdfWidth ? 'p' : 'l',
          unit: 'pt',
          format: [pdfWidth, pdfHeight]
        })
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`response_time_report_${timeRange}.pdf`)
        console.log('PDF saved successfully')
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please check the console for details.')
    }
  }

  return (
    <div ref={printRef} className="p-4 max-w-7xl mx-auto pb-20 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <BackButton to="/reports" />
      
      {/* 1. Header with Marketing Hook */}
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 dark:text-white whitespace-nowrap">
            <span className="text-2xl md:text-3xl">⚡</span>
            {t('Response Time Analysis')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm mt-1 truncate hidden sm:block">
            {t('Speed to Lead: Faster responses = Higher conversion rates.')}
          </p>
        </div>
        
        <div className="flex items-center gap-1  p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
           <div className="relative">
             <FaCalendarAlt className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none ${isRTL ? 'right-3' : 'left-3'}`} />
             <select 
               className={`select select-sm select-ghost focus:bg-transparent dark:text-gray-200 dark:focus:text-white text-xs sm:text-sm w-36 focus:ring-0 border-none ${isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'}`}
               value={timeRange}
               onChange={(e) => setTimeRange(e.target.value)}
             >
               <option value="7d" className="text-gray-900 dark:text-white">{t('Last 7 Days')}</option>
               <option value="30d" className="text-gray-900 dark:text-white">{t('Last 30 Days')}</option>
               <option value="90d" className="text-gray-900 dark:text-white">{t('Last 3 Months')}</option>
             </select>
           </div>
           
           <div className="h-4 w-px  mx-1" data-html2canvas-ignore></div>
           
           <button 
             className="btn btn-sm btn-ghost btn-square  dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
             title={t('Export Report')}
             onClick={handleExport}
             data-html2canvas-ignore
           >
             <FaDownload className="text-sm" />
           </button>
        </div>
      </div>

      {/* 2. High-Impact KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title={t('Avg Response Time')} 
          value={kpiData.avgResponse.value}
          subtext={kpiData.avgResponse.subtext}
          icon={FaClock} 
          color="blue" 
          trend={kpiData.avgResponse.trend} 
        />
        <KPICard 
          title={t('Within 5 Mins')} 
          value={kpiData.within5Min.value}
          subtext={t('Target: 80%')} 
          icon={FaBolt} 
          color="amber" 
          trend={kpiData.within5Min.trend}
        />
        <KPICard 
          title={t('Conversion Lift')} 
          value={kpiData.conversionLift.value}
          subtext={t('Due to faster replies')} 
          icon={FaChartLine} 
          color="emerald" 
          trend="up"
        />
        <KPICard 
          title={t('Missed Opps')} 
          value={kpiData.missedOpps.value}
          subtext={t('> 1hr response time')} 
          icon={FaExclamationTriangle} 
          color="rose" 
          trend="down"
        />
      </div>

      {/* 3. The "Golden Window" Chart (Correlation) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-lg dark:text-white">{t('The "Golden Window" Impact')}</h3>
              <p className="text-xs text-gray-400 mt-1">{t('How response time affects conversion rate')}</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.3} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                <YAxis yAxisId="left" orientation={isRTL ? "right" : "left"} axisLine={false} tickLine={false} tick={{fill: '#10B981', fontSize: 12}} unit="%" />
                <YAxis yAxisId="right" orientation={isRTL ? "left" : "right"} axisLine={false} tickLine={false} tick={{fill: '#EF4444', fontSize: 12}} unit="m" />
                <Tooltip content={<CustomTooltip />} />
                <Area yAxisId="left" type="monotone" dataKey="conversion" name={t('Conversion Rate')} stroke="#10B981" fillOpacity={1} fill="url(#colorConv)" strokeWidth={3} />
                <Area yAxisId="right" type="monotone" dataKey="avgTime" name={t('Avg Response (min)')} stroke="#EF4444" fillOpacity={1} fill="url(#colorTime)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Conversion Decay (Bar Chart) */}
        <div className="card glass-card p-6">
          <h3 className="font-bold text-lg dark:text-white mb-4">{t('Decay Rate')}</h3>
          <div className="space-y-4">
            {impactStats.map((d, i) => (
              <div key={i} className="group">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-600 dark:text-gray-300">{d.time}</span>
                  <span className="font-bold text-emerald-500">{d.conversion}% {t('Conv.')}</span>
                </div>
                <div className="h-2 w-full  rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500" 
                    style={{ width: `${(d.conversion / 25) * 100}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-gray-400 mt-1 text-right">{d.leads} {t('Leads')}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <FaBolt className="mt-0.5" />
              {t('Insight: Responding within 5 mins increases conversion chance by 391% compared to 1 hour+.')}
            </p>
          </div>
        </div>
      </div>

      {/* 5. Operational Bottlenecks & Team */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Hourly Heatmap (Bar) */}
        <div className="card glass-card p-6">
          <h3 className="font-bold text-lg dark:text-white mb-6">{t('Hourly Bottlenecks')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.3} />
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#9494a2ff', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9494a2ff', fontSize: 12}} unit="m" />
                <Tooltip cursor={{fill: 'white'}} content={<CustomTooltip />} />
                <Bar  dataKey="time" name={t('Avg Wait Time')} radius={[4, 4, 0, 0]}>
                  {hourlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.time > 15 ? '#EF4444' : entry.time > 10 ? '#F59E0B' : '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Leaderboard */}
        <div className="card glass-card p-0 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-lg dark:text-white">{t('Speed Leaderboard')}</h3>
            <FaTrophy className="text-yellow-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="  dark:text-white">
                <tr>
                  <th className={`p-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t('Agent')}</th>
                  <th className={`p-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t('Avg Time')}</th>
                  <th className={`p-4 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t('Score')}</th>
                  <th className={`p-4 font-medium ${isRTL ? 'text-left' : 'text-right'}`}>{t('Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {currentAgents.map((agent, i) => (
                  <tr key={i} className=" dark:hover:bg-transparent transition-colors">
                    <td className="p-4 font-medium dark:text-white flex items-center gap-2">

                      {agent.name}
                    </td>
                    <td className="p-4 font-mono text-blue-600 dark:text-blue-400">{agent.avgTime}</td>
                    <td className="p-4">
                      <div className="w-full   rounded-full h-1.5 w-24">
                        <div 
                          className={`h-1.5 rounded-full ${agent.score > 90 ? 'bg-emerald-500' : agent.score > 70 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                          style={{ width: `${agent.score}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className={`p-4 ${isRTL ? 'text-left' : 'text-right'}`}>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        agent.status === 'Top Performer' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        agent.status === 'Critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                        '  dark:text-white'
                      }`}>
                        {t(agent.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  )
}

export default ResponseTimeReport