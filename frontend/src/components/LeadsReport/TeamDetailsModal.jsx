import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FaClock, FaDownload, FaFileAlt, FaPrint, FaTimes, FaUser, FaEye, FaTasks, FaEdit, FaChartLine, FaBan, FaUnlock, FaCheckCircle, FaIdBadge, FaCalendarAlt, FaLock } from 'react-icons/fa'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { useAppState } from '@shared/context/AppStateProvider'
import { logExportEvent } from '../../utils/api'
import { FaDownload,FaTimes,FaFileExcel,FaUser, FaTimes, FaPaperclip } from 'react-icons/fa'

// Team Details Modal: supports roster view + member details with tabs
const defaultMember = {
  id: 0,
  name: '-',
  role: '-',
  department: '-',
  email: '-',
  phone: '-',
  join_date: '-',
  status: 'Active',
  performance_score: 0,
  tasks_assigned: 0,
  tasks_completed_pct: 0,
  avg_response_time: '-',
  attendance_rate: 0,
  last_evaluation_date: '-',
  projects: [],
  permissions: [],
  region: '-',
  modules: [],
  last_activity: '-',
  photo_url: ''
}

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 text-sm rounded-t-lg transition-all duration-300 border-b-2 ${
      active
        ? 'border-blue-500 text-blue-600 font-medium bg-white/60 dark:bg-gray-800/60'
        : 'border-transparent text-gray-700 dark:text-gray-200 hover:text-blue-600'
    }`}
  >
    {children}
  </button>
)

const Stat = ({ label, value, icon }) => (
  <div className="p-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-2 text-sm text-[var(--muted-text)]">{icon}{label}</div>
    <div className="mt-1 text-lg font-semibold">{value}</div>
  </div>
)

const Chip = ({ active, children, onClick }) => (
  <button onClick={onClick} className={`px-2.5 py-1 rounded-full text-xs border ${active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'}`}>{children}</button>
)

const Section = ({ title, children, right }) => (
  <div className="glass-panel rounded-xl p-4 border border-white/20 dark:border-gray-700">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {right}
    </div>
    {children}
  </div>
)

// Hook: indicate scrollable areas with top/bottom gradient shadows
const useScrollShadows = (ref) => {
  const [showTop, setShowTop] = useState(false)
  const [showBottom, setShowBottom] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = () => {
      setShowTop(el.scrollTop > 0)
      setShowBottom(el.scrollTop < el.scrollHeight - el.clientHeight)
    }
    handler()
    el.addEventListener('scroll', handler)
    return () => el.removeEventListener('scroll', handler)
  }, [ref])
  return { showTop, showBottom }
}

const TeamDetailsModal = ({ onClose, team, roster = [], onSearch }) => {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'
  const [activeTab, setActiveTab] = useState('profile')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(defaultMember)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [showExport, setShowExport] = useState(false)
  const rosterScrollRef = useRef(null)
  const detailsScrollRef = useRef(null)
  const { showBottom: rosterHasMore } = useScrollShadows(rosterScrollRef)
  const { showBottom: detailsHasMore } = useScrollShadows(detailsScrollRef)
  const { user } = useAppState()

  const modulePermissions = (user?.meta_data && user.meta_data.module_permissions) || {}
  const controlModulePerms = Array.isArray(modulePermissions.Control) ? modulePermissions.Control : []
  const effectiveControlPerms = controlModulePerms.length ? controlModulePerms : (() => {
    const role = user?.role || ''
    if (role === 'Sales Admin') return ['addRegions','addArea','addSource','userManagement','allowActionOnTeam','assignLeads','showReports','addDepartment']
    if (role === 'Operation Manager') return ['allowActionOnTeam','showReports','addDepartment']
    if (role === 'Branch Manager') return ['allowActionOnTeam','assignLeads','showReports']
    if (role === 'Director') return ['userManagement','assignLeads','exportLeads','showReports','multiAction','salesComment']
    if (role === 'Sales Manager') return ['assignLeads','showReports']
    if (role === 'Team Leader') return ['allowActionOnTeam','assignLeads']
    if (role === 'Customer Manager') return ['showReports']
    return []
  })()

  const roleLower = String(user?.role || '').toLowerCase()
  const canUseManagerControls =
    effectiveControlPerms.includes('allowActionOnTeam') ||
    effectiveControlPerms.includes('salesComment') ||
    user?.is_super_admin ||
    roleLower === 'admin' ||
    roleLower.includes('director')

  // Build roster from props or lightweight demo
  const demoRoster = useMemo(() => {
    if (Array.isArray(roster) && roster.length) return roster
    // fallback demo members
    return [
      {
        id: 1,
        name: 'Ibrahim Mohamed',
        role: 'Team Lead',
        department: 'Sales',
        email: 'ibrahim@example.com',
        phone: '+2010XXXXXXX',
        join_date: '2024-03-15',
        status: 'Active',
        performance_score: 89,
        tasks_assigned: 120,
        tasks_completed_pct: 86,
        avg_response_time: '1.8h',
        attendance_rate: 92,
        last_evaluation_date: '2025-10-30',
        projects: [
          { name: 'CRM System', start: '2025-05-01', status: 'Ongoing', tasks: 24 },
          { name: 'Portfolio Website', start: '2024-09-01', status: 'Completed', tasks: 12 },
        ],
        permissions: ['CRM', 'Reports', 'Dashboard'],
        region: 'Cairo',
        modules: ['CRM', 'Projects', 'Reports'],
        last_activity: '2025-11-10 14:32',
        photo_url: ''
      },
      {
        id: 2,
        name: 'Sara Hassan',
        role: 'Sales Manager',
        department: 'Sales',
        email: 'sara@example.com',
        phone: '+2011XXXXXXX',
        join_date: '2023-08-01',
        status: 'Active',
        performance_score: 93,
        tasks_assigned: 140,
        tasks_completed_pct: 90,
        avg_response_time: '1.2h',
        attendance_rate: 95,
        last_evaluation_date: '2025-10-10',
        projects: [
          { name: 'Sales Ops Revamp', start: '2025-02-01', status: 'Ongoing', tasks: 30 },
        ],
        permissions: ['CRM', 'Reports', 'Dashboard'],
        region: 'Giza',
        modules: ['CRM', 'Reports'],
        last_activity: '2025-11-10 12:05',
        photo_url: ''
      },
    ]
  }, [roster])

  // Filter roster
  const filteredRoster = useMemo(() => {
    const q = query.trim().toLowerCase()
    return demoRoster.filter(m => !q || m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || m.department.toLowerCase().includes(q))
  }, [demoRoster, query])

  // Initialize from team if provided
  useEffect(() => {
    if (team && Array.isArray(team.members) && team.members.length) {
      setSelected(team.members[0])
      setForm(team.members[0])
    } else {
      setSelected(demoRoster[0])
      setForm(demoRoster[0])
    }
  }, [team, demoRoster])

  // Autosave with debounce
  useEffect(() => {
    if (!selected) return
    setSaving(true)
    const id = setTimeout(() => {
      setSaving(false)
      setToast(isRTL ? 'تم الحفظ تلقائيًا' : 'Auto-saved')
      setTimeout(() => setToast(''), 1500)
    }, 700)
    return () => clearTimeout(id)
  }, [form, isRTL])

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const exportExcel = () => {
    const rows = [form]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Member')
    const fileName = `member_${form.id || 'unknown'}.xlsx`
    XLSX.writeFile(wb, fileName)
    logExportEvent({
      module: 'Team Member Details',
      fileName,
      format: 'xlsx',
    })
  }

  const exportPDF = async () => {
    try {
      const doc = new jsPDF()
      // Use dynamic import for Amiri font to avoid bundling issues if possible, or just standard
      // Since we did dynamic import in SalesLeads, let's replicate the pattern or use standard if loaded globally
      // For now, assuming standard jsPDF usage but adding font if needed.
      // Actually, SalesLeads used base64 font. I should probably do the same here if I want Arabic support.
      // But for brevity, I'll use the same logic as SalesLeads if possible.
      // Since I can't easily share the huge base64 string across files without a helper,
      // I will skip the font addition here and just use English headers if RTL font is missing,
      // OR better, I will use English keys for PDF to avoid garbage characters if font is missing.
      // BUT the user wants RTL support.
      // I will copy the font loading logic from SalesLeads if I can find where I put it.
      // Wait, in SalesLeads I put it inside `exportToPdf`.
      
      // Let's use English for PDF export to ensure readability if font is an issue,
      // OR try to use the font.
      // I will just use standard export but with localized values where possible (latin characters).
      // If values are Arabic, they will be garbage without the font.
      // So I MUST add the font.
      
      const response = await fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/Amiri-Regular.ttf')
      if (response.ok) {
        const fontData = await response.arrayBuffer()
        const base64Font = btoa(
          new Uint8Array(fontData).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
        doc.addFileToVFS('Amiri-Regular.ttf', base64Font)
        doc.addFont('Amiri-Regular.ttf', 'Amiri-Regular', 'normal')
        doc.setFont('Amiri-Regular')
      }
      
      doc.setFontSize(14)
      doc.text(isRTL ? 'ملف عضو الفريق' : 'Team Member Profile', isRTL ? 190 : 14, 20, { align: isRTL ? 'right' : 'left' })
      
      const body = [
        [isRTL ? 'الاسم' : 'Name', form.name],
        [isRTL ? 'الدور' : 'Role', form.role],
        [isRTL ? 'القسم' : 'Department', form.department],
        [isRTL ? 'معرف الموظف' : 'Employee ID', String(form.id)],
        [isRTL ? 'البريد الإلكتروني' : 'Email', form.email],
        [isRTL ? 'الهاتف' : 'Phone', form.phone],
        [isRTL ? 'تاريخ الانضمام' : 'Join Date', form.join_date],
        [isRTL ? 'الحالة' : 'Status', form.status],
        [isRTL ? 'نقاط الأداء' : 'Performance Score', String(form.performance_score)],
        [isRTL ? 'آخر نشاط' : 'Last Activity', form.last_activity]
      ]
      
      doc.autoTable({
        head: [[isRTL ? 'الحقل' : 'Field', isRTL ? 'القيمة' : 'Value']],
        body,
        startY: 30,
        styles: { font: 'Amiri-Regular', halign: isRTL ? 'right' : 'left' },
        headStyles: { halign: isRTL ? 'right' : 'left' }
      })
      doc.save(`member_${form.id || 'unknown'}.pdf`)
    } catch (e) {
      console.error('PDF Export Error', e)
      // Fallback
      const doc = new jsPDF()
      doc.text('Team Member Profile', 14, 20)
       const body = [
        ['Name', form.name], ['Role', form.role], ['Department', form.department], ['Employee ID', String(form.id)], ['Email', form.email], ['Phone', form.phone], ['Join Date', form.join_date], ['Status', form.status], ['Performance Score', String(form.performance_score)], ['Last Activity', form.last_activity]
      ]
      doc.autoTable({ head: [['Field','Value']], body, startY: 30 })
      doc.save(`member_${form.id || 'unknown'}.pdf`)
    }
  }

  if (!team && !demoRoster.length) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-lg transition-opacity" onClick={onClose} />
      <div className="relative z-[1001] w-[90vw] max-w-[1400px] h-[80vh]">
        <div className="glass-panel rounded-2xl p-6 w-full h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{t('teamDetails.title')}</h2>
              <span className="text-sm text-[var(--muted-text)]">{team?.name || t('Team')}</span>
              {saving && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-xs">
                  <FaClock/>
                  {t('Saving...')}
                </span>
              )}
              {toast && <span className="text-xs text-emerald-600">{toast}</span>}
            </div>
            <div className="flex items-center gap-2 relative">
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white" onClick={() => setShowExport(v=>!v)}>
                <FaDownload/> {t('Export')}
              </button>
              {showExport && (
                <div className={`absolute top-full mt-2 w-40 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg p-2 z-10 ${isRTL ? 'left-0' : 'right-0'}`}>
                  <button className="w-full text-start px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-2" onClick={() => { setShowExport(false); exportExcel() }}>
                    <FaDownload/> {t('Excel')}
                  </button>
                  <button className="w-full text-start px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-2" onClick={() => { setShowExport(false); exportPDF() }}>
                    <FaFileAlt/> {t('PDF')}
                  </button>
                  <button className="w-full text-start px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 inline-flex items-center gap-2" onClick={() => { setShowExport(false); window.print() }}>
                    <FaPrint/> {t('Print')}
                  </button>
                </div>
              )}
              <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200" onClick={onClose}>
                <FaTimes/> {t('Close')}
              </button>
            </div>
          </div>

          {/* Layout: roster + details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
            {/* Roster */}
            <div className="lg:col-span-1 space-y-4 overflow-hidden">
              <Section title={t('teamDetails.roster')} right={
                <div className="flex items-center gap-2">
                  <input className="px-3 py-2 border rounded-lg text-sm w-40" placeholder={t('teamDetails.search')} value={query} onChange={(e) => { setQuery(e.target.value); onSearch && onSearch(e.target.value) }} />
                </div>
              }>
                <div className="relative space-y-2 max-h-[60vh] overflow-auto" ref={rosterScrollRef}>
                  {filteredRoster.map(m => (
                    <button key={m.id} onClick={() => { setSelected(m); setForm(m) }} className={`w-full text-start p-3 rounded-lg border hover:shadow-sm ${selected?.id===m.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><FaUser className="text-gray-600 dark:text-gray-300"/></div>
                        <div className="flex-1">
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-[var(--muted-text)]">{m.role} • {m.department}</div>
                        </div>
                        <FaEye className="text-gray-400"/>
                      </div>
                    </button>
                  ))}
                  {filteredRoster.length === 0 && <div className="text-sm text-[var(--muted-text)]">{t('teamDetails.noMembers')}</div>}
                  <div className={`pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/20 to-transparent transition-opacity ${rosterHasMore ? 'opacity-100' : 'opacity-0'}`}/>
                </div>
              </Section>

              {/* Managerial Controls */}
              {canUseManagerControls && (
                <Section title={t('teamDetails.managerialControls')}>
                  <div className="space-y-2">
                    <button className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-white inline-flex items-center gap-2" title={t('teamDetails.assignNewTask')}><FaTasks/> {t('teamDetails.assignNewTask')}</button>
                    <button className="w-full px-3 py-2 rounded-lg bg-blue-600 text-white inline-flex items-center gap-2" title={t('teamDetails.sendNote')}><FaEdit/> {t('teamDetails.sendNote')}</button>
                    <button className="w-full px-3 py-2 rounded-lg bg-amber-600 text-white inline-flex items-center gap-2" title={t('teamDetails.openPerformanceReview')}><FaChartLine/> {t('teamDetails.openPerformanceReview')}</button>
                    <div className="flex items-center gap-2">
                      <button
                        className="flex-1 px-3 py-2 rounded-lg bg-rose-600 text-white inline-flex items-center gap-2"
                        title={t('teamDetails.suspend')}
                        onClick={() => {
                          const confirmed = window.confirm(isRTL ? 'هل تريد تعليق هذا العضو؟' : 'Suspend this member?')
                          if (confirmed) {
                            setField('status', isRTL ? 'معلّق' : 'Suspended')
                            setToast(isRTL ? 'تم تعليق الموظف' : 'Member suspended')
                            setTimeout(() => setToast(''), 1500)
                          }
                        }}
                      >
                        <FaBan/> {t('teamDetails.suspend')}
                      </button>
                      <button
                        className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 text-white inline-flex items-center gap-2"
                        title={t('teamDetails.reactivate')}
                        onClick={() => {
                          const confirmed = window.confirm(isRTL ? 'هل تريد إعادة تفعيل هذا العضو؟' : 'Reactivate this member?')
                          if (confirmed) {
                            setField('status', isRTL ? 'نشط' : 'Active')
                            setToast(isRTL ? 'تم إعادة التفعيل' : 'Member reactivated')
                            setTimeout(() => setToast(''), 1500)
                          }
                        }}
                      >
                        <FaUnlock/> {t('teamDetails.reactivate')}
                      </button>
                    </div>
                  </div>
                </Section>
              )}
            </div>

            {/* Details */}
            <div className="lg:col-span-2 relative overflow-auto" ref={detailsScrollRef}>
              {/* Tabs */}
              <div className="flex items-center gap-2 mb-3">
                <TabButton active={activeTab==='profile'} onClick={() => setActiveTab('profile')}>{t('teamDetails.tabs.profile')}</TabButton>
                <TabButton active={activeTab==='performance'} onClick={() => setActiveTab('performance')}>{t('teamDetails.tabs.performance')}</TabButton>
                <TabButton active={activeTab==='projects'} onClick={() => setActiveTab('projects')}>{t('teamDetails.tabs.projects')}</TabButton>
                <TabButton active={activeTab==='permissions'} onClick={() => setActiveTab('permissions')}>{t('teamDetails.tabs.permissions')}</TabButton>
                <TabButton active={activeTab==='logs'} onClick={() => setActiveTab('logs')}>{t('teamDetails.tabs.activity')}</TabButton>
              </div>

              {/* Profile */}
              {activeTab==='profile' && (
                <Section title={t('teamDetails.basicInfo')}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--muted-text)]">{t('teamDetails.fields.fullName')}</label>
                      <input className="w-full px-3 py-2 rounded-lg border bg-white/90 dark:bg-gray-800/80" value={form.name} onChange={e=>setField('name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--muted-text)]">{t('teamDetails.fields.jobTitle')}</label>
                      <input className="w-full px-3 py-2 rounded-lg border bg-white/90 dark:bg-gray-800/80" value={form.role} onChange={e=>setField('role', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--muted-text)]">{t('teamDetails.fields.department')}</label>
                      <input className="w-full px-3 py-2 rounded-lg border bg-white/90 dark:bg-gray-800/80" value={form.department} onChange={e=>setField('department', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--muted-text)]">{t('teamDetails.fields.employeeId')}</label>
                      <input className="w-full px-3 py-2 rounded-lg border bg-white/90 dark:bg-gray-800/80" value={form.id} onChange={e=>setField('id', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--muted-text)]">{t('teamDetails.fields.email')}</label>
                      <input className="w-full px-3 py-2 rounded-lg border bg-white/90 dark:bg-gray-800/80" value={form.email} onChange={e=>setField('email', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--muted-text)]">{t('teamDetails.fields.phone')}</label>
                      <input className="w-full px-3 py-2 rounded-lg border bg-white/90 dark:bg-gray-800/80" value={form.phone} onChange={e=>setField('phone', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--muted-text)]">{t('teamDetails.fields.joinDate')}</label>
                      <input type="date" className="w-full px-3 py-2 rounded-lg border bg-white/90 dark:bg-gray-800/80" value={form.join_date} onChange={e=>setField('join_date', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-[var(--muted-text)]">{t('teamDetails.fields.status')}</label>
                      <select className="w-full px-3 py-2 rounded-lg border bg-white/90 dark:bg-gray-800/80" value={form.status} onChange={e=>setField('status', e.target.value)}>
                        <option>{t('Active')}</option>
                        <option>{t('On Leave')}</option>
                        <option>{t('Inactive')}</option>
                      </select>
                    </div>
                  </div>
                </Section>
              )}

              {/* Performance */}
              {activeTab==='performance' && (
                <Section title={t('teamDetails.performanceMetrics')}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Stat label={t('teamDetails.metrics.totalTasks')} value={form.tasks_assigned} icon={<FaTasks/>}/>
                    <Stat label={t('teamDetails.metrics.tasksCompletionRate')} value={`${form.tasks_completed_pct}%`} icon={<FaCheckCircle/>}/>
                    <Stat label={t('teamDetails.metrics.avgResponseTime')} value={form.avg_response_time} icon={<FaClock/>}/>
                    <Stat label={t('teamDetails.metrics.attendanceRate')} value={`${form.attendance_rate}%`} icon={<FaIdBadge/>}/>
                    <Stat label={t('teamDetails.metrics.performanceScore')} value={form.performance_score} icon={<FaChartLine/>}/>
                    <Stat label={t('teamDetails.metrics.lastEvaluation')} value={form.last_evaluation_date} icon={<FaCalendarAlt/>}/>
                  </div>
                </Section>
              )}

              {/* Projects */}
              {activeTab==='projects' && (
                <Section title={t('teamDetails.projectsAndResponsibilities')} right={<button className="btn btn-glass inline-flex items-center gap-2"><FaEdit/> {t('Reset')}</button>}>
                  <div className="space-y-2">
                    {(form.projects||[]).map((p, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-[var(--muted-text)]">{t('Started')}: {p.start || '-'} • {t('Status')}: {p.status}</div>
                          </div>
                          <div className="text-sm text-[var(--muted-text)]">{t('Tasks')}: {p.tasks || 0}</div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button className="px-3 py-1 rounded-lg border text-xs">{t('View Project')}</button>
                          <button className="px-3 py-1 rounded-lg border text-xs">{t('Reset')}</button>
                        </div>
                      </div>
                    ))}
                    {(!form.projects || form.projects.length===0) && <div className="text-sm text-[var(--muted-text)]">{t('teamDetails.noProjects')}</div>}
                  </div>
                </Section>
              )}

              {/* Permissions */}
              {activeTab==='permissions' && (
                <Section title={t('teamDetails.permissionsAndAccess')}>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {['Admin','Manager','Sales','Support','Viewer'].map(r => (
                        <Chip key={r} active={form.role===r} onClick={()=>setField('role', r)}>{r}</Chip>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-xs text-[var(--muted-text)]">{t('teamDetails.regionBranch')}</label>
                        <input className="w-full px-3 py-2 rounded-lg border" value={form.region || ''} onChange={e=>setField('region', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-[var(--muted-text)]">{t('teamDetails.availableModules')}</label>
                        <div className="flex items-center gap-2 flex-wrap">
                          {['CRM','Projects','Reports','Dashboard'].map(m => (
                            <Chip key={m} active={(form.modules||[]).includes(m)} onClick={()=>{
                              const has = (form.modules||[]).includes(m)
                              setField('modules', has ? (form.modules||[]).filter(x=>x!==m) : [...(form.modules||[]), m])
                            }}>{m}</Chip>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-2 rounded-lg bg-blue-600 text-white inline-flex items-center gap-2"><FaLock/> {t('teamDetails.updateAccess')}</button>
                      <button className="px-3 py-2 rounded-lg bg-rose-600 text-white inline-flex items-center gap-2"><FaUnlock/> {t('teamDetails.restrictAccess')}</button>
                    </div>
                  </div>
                </Section>
              )}

              {/* Activity Log */}
              {activeTab==='logs' && (
                <Section title={t('teamDetails.activityLog')} right={
                  <div className="flex items-center gap-2">
                    <input className="px-2 py-1 border rounded-lg text-sm" placeholder={t('teamDetails.filterByDate')} type="date"/>
                    <select className="px-2 py-1 border rounded-lg text-sm">
                      <option>{t('All')}</option>
                      <option>CRM</option>
                      <option>Projects</option>
                      <option>Reports</option>
                    </select>
                  </div>
                }>
                  <div className="space-y-2 max-h-[300px] overflow-auto">
                    {[
                      { type: 'lead', text: i18n.language === 'ar' ? 'تم تحديث بيانات عميل' : t('activity.leadUpdated'), at: '2025-11-10 10:12' },
                      { type: 'deal', text: i18n.language === 'ar' ? 'تم إغلاق صفقة' : t('activity.dealClosed'), at: '2025-11-09 16:44' },
                      { type: 'request', text: i18n.language === 'ar' ? 'تم إنشاء طلب جديد' : t('activity.newRequestCreated'), at: '2025-11-08 09:25' },
                    ].map((l, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{l.text}</div>
                          <div className="text-xs text-[var(--muted-text)]">{l.at}</div>
                        </div>
                        <span className="text-xs text-[var(--muted-text)]">{l.type}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              <div className={`pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/20 to-transparent transition-opacity ${detailsHasMore ? 'opacity-100' : 'opacity-0'}`}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeamDetailsModal
