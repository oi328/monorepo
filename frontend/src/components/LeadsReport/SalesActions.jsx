import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const SalesActions = ({ reservationData = [], callsData = [], teamsData = [], totalAccounts = 0, lastUpdate, onUpdate }) => {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  const navigate = useNavigate()
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const totalReservations = reservationData.length
  const totalReservationRevenue = useMemo(() => reservationData.reduce((sum, r) => sum + (r.revenue || 0), 0), [reservationData])
  const totalCalls = useMemo(() => callsData.reduce((sum, c) => sum + (c.value || 0), 0), [callsData])
  const topTeam = useMemo(() => {
    const sorted = [...teamsData].sort((a, b) => (b.accounts || 0) - (a.accounts || 0))
    return sorted[0] || null
  }, [teamsData])

  const callsMax = useMemo(() => {
    const vals = callsData.map(c => c.value || 0)
    return Math.max(100, ...vals)
  }, [callsData])

  // Derived metrics for redesigned KPIs
  const followUpsCount = useMemo(() => callsData.filter(c => /follow/i.test(c?.name || '')).reduce((s, c) => s + (c.value || 0), 0), [callsData])
  const meetingsCount = useMemo(() => callsData.filter(c => /(meeting|visit)/i.test(c?.name || '')).reduce((s, c) => s + (c.value || 0), 0), [callsData])
  const totalActions = useMemo(() => totalCalls + followUpsCount + meetingsCount, [totalCalls, followUpsCount, meetingsCount])
  const conversionRateStr = useMemo(() => {
    if (totalCalls > 0) return `${Math.round((totalReservations / totalCalls) * 100)}%`
    return typeof topTeam?.conversion === 'string' ? topTeam.conversion : '—'
  }, [totalReservations, totalCalls, topTeam])

  // Filters removed per request; using global page context only

  return (
    <div className="space-y-6 my-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{isRTL ? 'نظرة عامة على إجراءات المبيعات' : 'Sales Actions Overview'}</h2>
      </div>

      {/* Filters removed */}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <KpiCard label={isRTL ? 'إجمالي الإجراءات' : 'Total Actions'} value={totalActions} tone="default" icon={<LuUsers />} tooltip={isRTL ? 'جميع الإجراءات المتتبعة' : 'All tracked actions'} />
        <KpiCard label={isRTL ? 'المكالمات الصادرة' : 'Calls Made'} value={totalCalls} tone="warning" icon={<LuPhone />} tooltip={isRTL ? 'إجمالي عدد المكالمات' : 'Total calls count'} />
        <KpiCard label={isRTL ? 'المتابعات المنجزة' : 'Follow-ups Done'} value={followUpsCount} tone="info" icon={<LuCalendarCheck />} tooltip={isRTL ? 'إجراءات المتابعة' : 'Follow-up actions'} />
        <KpiCard label={isRTL ? 'الاجتماعات المجدولة' : 'Meetings Scheduled'} value={meetingsCount} tone="success" icon={<LuCalendarCheck />} tooltip={isRTL ? 'عدد الاجتماعات' : 'Meetings count'} />
        <KpiCard label={isRTL ? 'نسبة التحويل %' : 'Conversion Rate %'} value={conversionRateStr} tone="success" icon={<LuDollarSign />} tooltip={isRTL ? 'العملاء المحتملين المحولين مقابل المكالمات' : 'Leads converted vs calls'} />
      </div>

      {/* Calls Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BarChartCard title={isRTL ? 'توزيع الإجراءات' : 'Action Distribution'} subtitle={isRTL ? 'حسب النوع' : 'By type'} data={callsData} />
          <div className="mt-4">
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 transition" onClick={() => navigate('/reports/activity')}>
              {isRTL ? 'عرض تقرير النشاط المفصل' : 'View Detailed Activity Report'}
            </button>
          </div>
        </div>

        {/* Top Team */}
        <div className="p-4 md:p-6 rounded-xl border border-gray-800 bg-[#0b1220]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-semibold">{isRTL ? 'الفريق الأفضل' : 'Top Team'}</h3>
          </div>
          {topTeam ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-400">{topTeam.team}</div>
              <div className="text-2xl font-bold text-green-400">{topTeam.accounts} {isRTL ? 'حسابات' : 'Accounts'}</div>
              <div className="text-xs text-gray-400" title="Conversion Rate">{isRTL ? 'تحويل' : 'Conversion'}: {topTeam.conversion}</div>
              <div>
                <button
                  className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 transition"
                  onClick={() => navigate(`/reports/team?team=${encodeURIComponent(topTeam.team)}&manager=All`)}
                >
                  {isRTL ? 'عرض تفاصيل الفريق' : 'View Team Details'}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">{isRTL ? 'لا توجد بيانات للفريق' : 'No team data available'}</div>
          )}
        </div>
      </div>

      {/* Teams Leaderboard */}
      <div className="p-4 md:p-6 rounded-xl border border-gray-800 bg-[#0b1220]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold">{isRTL ? 'لوحة المتصدرين' : 'Leaderboard'}</h3>
          <span className="text-xs text-gray-400">{isRTL ? 'حسب الحسابات' : 'By Accounts'}</span>
        </div>
        <DataTable
          columns={[
            isRTL ? 'الرتبة' : 'Rank',
            isRTL ? 'الفريق' : 'Team',
            isRTL ? 'حسابات' : 'Accounts',
            isRTL ? 'نسبة التحويل' : 'Conversion Rate',
            isRTL ? 'التفاصيل' : 'Details'
          ]}
          align={['center', 'left', 'center', 'center', 'center']}
          rows={teamsData.map(teamRow => [
            teamRow.rank,
            (
              <button
                key={`team-${teamRow.team}`}
                className="text-blue-400 hover:underline"
                onClick={() => { setSelectedTeam({ name: teamRow.team }); setShowTeamModal(true) }}
              >
                {teamRow.team}
              </button>
            ),
            teamRow.accounts,
            teamRow.conversion,
            (
              <button
                key={`btn-${teamRow.team}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 transition text-xs"
                onClick={() => navigate(`/reports/team?team=${encodeURIComponent(teamRow.team)}&manager=All`)}
                title={isRTL ? 'التفاصيل' : 'Details'}
              >
                <LuEye className="text-gray-200" />
              </button>
            )
          ])}
        />
      </div>

      {/* Recent Reservations Summary */}
      <SummaryCard 
        title={isRTL ? 'ملخص الحجوزات الشهرية' : 'Monthly Reservations Summary'} 
        subtitle={isRTL ? `آخر ${Math.min(6, reservationData.length)} أشهر` : `Last ${Math.min(6, reservationData.length)} months`} 
        data={reservationData} 
      />
      {showTeamModal && (
        <TeamDetailsModal onClose={() => setShowTeamModal(false)} team={selectedTeam} />
      )}
    </div>
  )
}

export default SalesActions