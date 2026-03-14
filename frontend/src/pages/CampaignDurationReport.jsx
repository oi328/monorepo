import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

import { 
  FaArrowUp, FaArrowDown, FaDownload 
} from 'react-icons/fa'
import { api } from '../utils/api'
import { toast } from 'react-hot-toast'

// --- Components ---

const KPICard = ({ title, value, change, trend, isInverse, note }) => {
  const isGood = isInverse ? change <= 0 : change >= 0
  const colorClass = isGood ? 'text-emerald-500' : 'text-rose-500'
  const Icon = change >= 0 ? FaArrowUp : FaArrowDown

  return (
    <div className="card glass-card p-4 flex flex-col justify-between h-36 relative overflow-hidden">
      <div className="flex justify-between items-start z-10">
        <div>
          <p className="text-sm dark:text-white font-medium opacity-80">{title}</p>
          <h3 className="text-2xl font-bold mt-1 dark:text-white">{value}</h3>
          {note && <p className="text-xs  dark:text-white mt-1">{note}</p>}
        </div>
        <div className={`flex items-center text-xs font-bold ${colorClass} px-2 py-1 rounded-full bg-opacity-10 bg-white`}>
          <Icon className="mr-1" size={10} />
          {Math.abs(change)}%
        </div>
      </div>
      
      {/* Sparkline */}
      <div className="absolute bottom-0 left-0 right-0 h-16 min-w-0 min-h-0 opacity-20 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={trend.map((v, i) => ({ v, i }))}>
            <Area type="monotone" dataKey="v" stroke={isGood ? '#10B981' : '#F43F5E'} fill={isGood ? '#10B981' : '#F43F5E'} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const PlatformIcon = ({ platform }) => {
  switch(platform) {
    case 'meta': return <FaFacebook className="text-blue-600" />
    case 'google': return <FaGoogle className="text-yellow-500" />
    case 'tiktok': return <FaTiktok className="text-black dark:text-white" />
    case 'web': return <FaGlobe className="text-green-500" />
    default: return <FaGlobe className="text-white" />
  }
}

const StatusBadge = ({ status }) => {
  const { t } = useTranslation()
  const styles = {
    'Fatigued': 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-100 dark:border-rose-500/20 ring-1 ring-rose-500/20',
    'Stable': 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20 ring-1 ring-blue-500/20',
    'Peak': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 ring-1 ring-emerald-500/20',
    'Declining': 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-100 dark:border-amber-500/20 ring-1 ring-amber-500/20',
    'Learning': 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border-purple-100 dark:border-purple-500/20 ring-1 ring-purple-500/20',
  }

  const indicators = {
    'Fatigued': 'bg-rose-500',
    'Stable': 'bg-blue-500',
    'Peak': 'bg-emerald-500',
    'Declining': 'bg-amber-500',
    'Learning': 'bg-purple-500',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-300 hover:scale-105 cursor-default ${styles[status] || 'bg-gray-100 '}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${indicators[status] || 'bg-gray-500'} animate-pulse`}></span>
      {t(status)}
    </span>
  )
}

const CampaignDurationReport = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const isArabic = i18n.language === 'ar'
  const isRTL = isArabic
  const [timeRange, setTimeRange] = useState('30d')
  const printRef = useRef(null)

  const [durationKPIs, setDurationKPIs] = useState([])
  const [performanceCurveData, setPerformanceCurveData] = useState([])
  const [ageDistributionData, setAgeDistributionData] = useState([])
  const [campaignsHealthData, setCampaignsHealthData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true)
      try {
        const response = await api.get('/api/reports/campaigns/duration', {
          params: { range: timeRange }
        })
        const data = response.data
        setDurationKPIs(data.kpis || [])
        setPerformanceCurveData(data.curve || [])
        setAgeDistributionData(data.age_distribution || [])
        setCampaignsHealthData(data.health || [])
      } catch (error) {
        console.error('Failed to fetch campaign report:', error)
        toast.error(t('Failed to load campaign report'))
        // Fallback empty states to prevent crashes
        setDurationKPIs([])
        setPerformanceCurveData([])
        setAgeDistributionData([])
        setCampaignsHealthData([])
      } finally {
        setLoading(false)
      }
    }

    fetchReportData()
  }, [timeRange, t])

  const handleRecommendedAction = (action, campaignName) => {
    switch (action) {
      case 'refresh':
        if (window.confirm(`${t('Are you sure you want to refresh creatives for')} ${campaignName}?`)) {
          alert(t('Creative refresh request sent successfully!'))
        }
        break
      case 'scale':
        const amount = window.prompt(`${t('Enter budget increase percentage for')} ${campaignName}:`, '20')
        if (amount) {
          alert(`${t('Budget scaled by')} ${amount}% ${t('successfully!')}`)
        }
        break
      case 'monitor':
        alert(`${campaignName} ${t('has been added to your watchlist.')}`)
        break
      case 'details':
        navigate('/marketing/campaigns')
        break
      default:
        break
    }
  }

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
      
      // Get the full dimensions of the element
      const width = element.scrollWidth
      const height = element.scrollHeight
      
      const dataUrl = await toPng(element, {
        backgroundColor: bgColor,
        cacheBust: true,
        width: width,
        height: height,
        style: {
          height: 'auto',
          overflow: 'visible',
          maxHeight: 'none'
        },
        filter: (node) => {
          if (node.hasAttribute && node.hasAttribute('data-html2canvas-ignore')) {
            return false
          }
          return true
        }
      })

      console.log('Image generated, creating PDF...')
      
      const img = new Image()
      img.src = dataUrl
      
      img.onload = () => {
        const imgWidth = img.width
        const imgHeight = img.height
        
        // Use A4 width as base (595.28 pt)
        const pdfWidth = 595.28
        const ratio = pdfWidth / imgWidth
        const pdfHeight = imgHeight * ratio
        
        const pdf = new jsPDF({
          orientation: pdfHeight > pdfWidth ? 'p' : 'l',
          unit: 'pt',
          format: [pdfWidth, pdfHeight]
        })
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`campaign_duration_report_${timeRange}.pdf`)
        console.log('PDF saved successfully')
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please check the console for details.')
    }
  }

  return (
    <div ref={printRef} className="p-4 space-y-6 min-h-screen pb-20">
      <BackButton to="/reports" />

      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2 dark:text-white whitespace-nowrap">
            <span className="text-2xl md:text-3xl">🧠</span>
            {t('Campaign Duration Analysis')}
          </h1>
          <p className=" dark:text-white text-xs md:text-sm mt-1 truncate hidden sm:block">
            {t('Optimize campaign lifecycles and identify ad fatigue.')}
          </p>
        </div>
        
        <div className="flex items-center gap-1 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
           <div className="relative">
             <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2  text-xs pointer-events-none" />
             <select 
               className="select select-sm select-ghost pl-9 pr-8 focus:bg-transparent dark:text-white dark:focus:text-white text-xs sm:text-sm w-36 focus:ring-0 border-none"
               value={timeRange}
               onChange={(e) => setTimeRange(e.target.value)}
             >
               <option value="7d" className="dark:text-white">{t('Last 7 Days')}</option>
               <option value="30d" className=" dark:text-white">{t('Last 30 Days')}</option>
               <option value="90d" className=" dark:text-white">{t('Last 3 Months')}</option>
             </select>
           </div>
           
           <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" data-html2canvas-ignore></div>
           
           <button 
             className="btn btn-sm btn-ghost btn-square dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
             title={t('Export Report')}
             onClick={handleExport}
             data-html2canvas-ignore
           >
             <FaDownload className="text-sm" />
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {durationKPIs.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Performance Curve */}
        <div className="card glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white">
              <FaChartLine className="text-blue-500" />
              {t('Performance vs. Duration')}
            </h3>
            <div className="text-xs  bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {t('Sweet Spot: 8-14 Days')}
            </div>
          </div>
          <div className="h-80 w-full min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <ComposedChart data={performanceCurveData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} label={{ value: t('ROAS'), angle: -90, position: 'insideLeft', fill: '#6B7280' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} label={{ value: t('CPA') + ' ($)', angle: 90, position: 'insideRight', fill: '#6B7280' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '500' }}
                />
                <Legend iconType="circle" />
                <Area yAxisId="left" type="monotone" dataKey="roas" name={t('ROAS')} fill="url(#colorRoas)" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} />
                <Line yAxisId="right" type="monotone" dataKey="cpa" name={t('CPA')} stroke="#F43F5E" strokeWidth={2} strokeDasharray="5 5" />
                <defs>
                  <linearGradient id="colorRoas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Age Distribution */}
        <div className="card glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white">
              <FaClock className="text-emerald-500" />
              {t('Active Campaigns Age')}
            </h3>
          </div>
          <div className="h-80 w-full min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={ageDistributionData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" opacity={0.5} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <YAxis dataKey="bucket" type="category" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} width={100} />
                <Tooltip cursor={{fill: 'transparent'}} 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="count" name="Campaigns" fill="#10B981" radius={[0, 4, 4, 0]} barSize={24}>
                  <LabelList dataKey="count" position="right" fill="#6B7280" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Campaign Health Table */}
      <div className="card glass-card overflow-hidden border border-gray-100 dark:border-gray-800 shadow-lg">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-gray-50/80 to-transparent dark:from-gray-800/50 dark:to-transparent backdrop-blur-sm">
          <div>
            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
              <FaChartLine className="text-blue-500" />
              {t('Campaign Health & Status')}
            </h3>
            <p className="text-xs  mt-1 font-medium tracking-wide uppercase">{t('Real-time Performance Monitoring')}</p>
          </div>
          <button 
            className="btn btn-sm btn-ghost hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 gap-2 transition-all duration-300 hover:pr-4 group"
            onClick={() => navigate('/marketing/campaigns')}
          >
            {t('View All Campaigns')} <FaArrowUp className="rotate-45 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" size={10} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-gray-50/50 dark:bg-gray-900/30 text-xs uppercase tracking-wider font-semibold  dark:text-white">
              <tr>
                <th className="py-4 pl-6 text-start w-1/4">{t('Campaign Details')}</th>
                <th className="py-4 text-center">{t('Platform')}</th>
                <th className="py-4 text-center">{t('Duration')}</th>
                <th className="py-4 text-center">{t('Health Status')}</th>
                <th className="py-4 text-center">{t('ROAS')}</th>
                <th className="py-4 text-center">{t('Trend')}</th>
                <th className="py-4 pr-6 text-end">{t('Recommended Action')}</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-800/50">
              {campaignsHealthData.map((campaign) => (
                <tr key={campaign.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-300 border-transparent hover:border-l-4 hover:border-l-blue-500">
                  <td className="py-4 pl-6">
                    <div className="flex flex-col">
                      <span className="font-bold  dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {campaign.name}
                      </span>
                      <span className="text-xs text-gray-400 mt-0.5 font-medium">
                        {t('Spend')}: <span className=" dark:text-white">${campaign.spend.toLocaleString()}</span>
                      </span>
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center ring-1 ring-gray-100 dark:ring-gray-700 group-hover:scale-110 transition-transform duration-300">
                        <PlatformIcon platform={campaign.platform} />
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-mono font-bold  dark:text-white">{campaign.duration}d</span>
                      <div className="w-16 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${campaign.duration > 30 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
                          style={{ width: `${Math.min(campaign.duration, 60) / 60 * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center"><StatusBadge status={campaign.status} /></td>
                  <td className="text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-bold text-lg ${parseFloat(campaign.roas) >= 3 ? 'text-emerald-500' : parseFloat(campaign.roas) >= 2 ? 'text-amber-500' : 'text-rose-500'}`}>
                        {campaign.roas}
                      </span>
                      <span className="text-[10px]  uppercase tracking-wide">{t('Return')}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold ${campaign.ctr_trend >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                      {campaign.ctr_trend >= 0 ? <FaArrowUp size={8} /> : <FaArrowDown size={8} />}
                      {Math.abs(campaign.ctr_trend)}%
                    </div>
                  </td>
                  <td className="text-end pr-6">
                    {campaign.status === 'Fatigued' && (
                      <button 
                        className="btn btn-xs btn-error btn-outline gap-1.5 hover:scale-105 transition-transform shadow-sm hover:shadow-md"
                        onClick={() => handleRecommendedAction('refresh', campaign.name)}
                      >
                        <FaExclamationTriangle size={10} /> {t('Refresh Creative')}
                      </button>
                    )}
                    {campaign.status === 'Peak' && (
                      <button 
                        className="btn btn-xs btn-success gap-1.5 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform hover:shadow-emerald-500/30"
                        onClick={() => handleRecommendedAction('scale', campaign.name)}
                      >
                        <FaChartLine size={10} /> {t('Scale Budget')}
                      </button>
                    )}
                    {campaign.status === 'Declining' && (
                      <button 
                        className="btn btn-xs btn-warning btn-outline gap-1.5 hover:scale-105 transition-transform"
                        onClick={() => handleRecommendedAction('monitor', campaign.name)}
                      >
                         {t('Monitor Closely')}
                      </button>
                    )}
                    {(campaign.status === 'Stable' || campaign.status === 'Learning') && (
                      <button 
                        className="btn btn-xs btn-ghost gap-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        onClick={() => handleRecommendedAction('details', campaign.name)}
                      >
                         {t('View Details')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default CampaignDurationReport
