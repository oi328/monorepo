import { useMemo, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@utils/api'

export default function UserManagementDepartmentDetails() {
  const { id } = useParams()
  const { i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const [tab, setTab] = useState('overview')
  const [showEditModal, setShowEditModal] = useState(false)
  const navigate = useNavigate()

  const [dept, setDept] = useState(null)
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [tickets, setTickets] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const [ticketFilters, setTicketFilters] = useState({
    type: [],
    status: [],
    priority: []
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [deptRes, teamsRes, usersRes, ticketsRes, tasksRes] = await Promise.all([
        api.get(`/api/departments/${id}`),
        api.get(`/api/teams?department_id=${id}`),
        api.get(`/api/users?department_id=${id}`),
        api.get(`/api/tickets?department_id=${id}`),
        api.get(`/api/tasks?department_id=${id}`)
      ])
      
      setDept(deptRes.data)
      setTeams(teamsRes.data.data || teamsRes.data)
      setUsers(usersRes.data)
      setTickets(ticketsRes.data.data || ticketsRes.data)
      setTasks(tasksRes.data.data || tasksRes.data)
    } catch (err) {
      console.error('Failed to load department details', err)
      window.dispatchEvent(new CustomEvent('app:toast', { 
        detail: { type: 'error', message: isArabic ? 'فشل تحميل البيانات' : 'Failed to load data' } 
      }))
    } finally {
      setLoading(false)
    }
  }, [id, isArabic])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const kpis = useMemo(() => {
    if (!tickets || !tasks) return { activeTickets: 0, avgResponseTime: '-', tasksInProgress: 0, csat: '-' }
    
    const activeTickets = tickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length
    const tasksInProgress = tasks.filter(t => t.status === 'In Progress').length
    
    return {
        activeTickets,
        avgResponseTime: '2h 15m', // Placeholder
        tasksInProgress,
        csat: '92%' // Placeholder
    }
  }, [tickets, tasks])

  const filteredTickets = useMemo(() => {
    if (!tickets) return []
    return tickets.filter(t => {
      // Assuming 'type' field exists in Ticket model, or we treat all as 'Ticket' if missing
      const type = t.type || 'Ticket' 
      if (ticketFilters.type.length > 0 && !ticketFilters.type.includes(type)) return false
      if (ticketFilters.status.length > 0 && !ticketFilters.status.includes(t.status)) return false
      if (ticketFilters.priority.length > 0 && !ticketFilters.priority.includes(t.priority)) return false
      return true
    })
  }, [tickets, ticketFilters])

  const ticketTypes = ["Ticket", "Lead"]
  const ticketStatuses = ["Open", "Pending", "Closed", "Resolved", "In Progress"]
  const ticketPriorities = ["High", "Medium", "Low", "Urgent"]

  const closePage = () => {
    navigate('/user-management/departments')
  }

  const deleteDepartment = async () => {
    if (!window.confirm(isArabic ? 'هل أنت متأكد من حذف هذا القسم؟' : 'Are you sure you want to delete this department?')) return
    
    try {
        await api.delete(`/api/departments/${id}`)
        window.dispatchEvent(new CustomEvent('app:toast', { 
            detail: { type: 'success', message: isArabic ? 'تم حذف القسم بنجاح' : 'Department deleted successfully' } 
        }))
        navigate('/user-management/departments')
    } catch (err) {
        console.error(err)
        window.dispatchEvent(new CustomEvent('app:toast', { 
            detail: { type: 'error', message: isArabic ? 'فشل حذف القسم' : 'Failed to delete department' } 
        }))
    }
  }

  const editDepartment = () => {
    setShowEditModal(true)
  }

  const renderTabIcon = (key) => {
    switch (key) {
      case 'overview':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        )
      case 'employees':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
          </svg>
        )
      case 'teams':
         return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
         )
      case 'tickets':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <line x1="10" y1="9" x2="8" y2="9"></line>
          </svg>
        )
      case 'tasks':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M9 12l2 2 4-4"></path>
          </svg>
        )
      case 'analytics':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10"></line>
            <line x1="18" y1="20" x2="18" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="16"></line>
          </svg>
        )
      default:
        return null
    }
  }

  if (loading) {
      return (
          <Layout>
              <div className="flex justify-center items-center h-screen">
                  <span className="loading loading-spinner loading-lg"></span>
              </div>
          </Layout>
      )
  }

  if (!dept) return null

  return (
    <Layout title={isArabic ? `تفاصيل القسم — ${dept.name}` : `Department Details — ${dept.name}`}>
      <div className="container mx-auto px-4 py-4">
        {/* Top-right actions */}
        <div className="flex justify-end items-center gap-2 mb-2">

          {/* Delete */}
          <button className="btn btn-ghost btn-square p-1" title={isArabic ? 'حذف' : 'Delete'} aria-label={isArabic ? 'حذف' : 'Delete'} onClick={deleteDepartment}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          {/* Edit */}
          <button className="btn btn-ghost btn-square p-1" title={isArabic ? 'تعديل' : 'Edit'} aria-label={isArabic ? 'تعديل' : 'Edit'} onClick={editDepartment}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
            </svg>
          </button>
          {/* Close */}
          <button className="btn btn-ghost btn-square p-1" title={isArabic ? 'إغلاق' : 'Close'} aria-label={isArabic ? 'إغلاق' : 'Close'} onClick={closePage}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        {/* Header */}
        <div className="glass-panel rounded-xl p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">{dept.name}</h1>
              <div className="text-sm text-[var(--muted-text)]">{isArabic ? 'مدير القسم:' : 'Manager:'} {dept.manager?.name || '-'}</div>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-[var(--muted-text)]">{isArabic ? 'إجمالي الموظفين' : 'Total Employees'}</div>
                <div className="text-lg font-bold">{users.length}</div>
              </div>
               <div>
                <div className="text-xs text-[var(--muted-text)]">{isArabic ? 'عدد الفرق' : 'Teams Count'}</div>
                <div className="text-lg font-bold">{teams.length}</div>
              </div>
            </div>
          </div>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="kpi-card"><div className="kpi-title">{isArabic ? 'تيكتس نشطة' : 'Active Tickets'}</div><div className="kpi-value">{kpis.activeTickets}</div></div>
            <div className="kpi-card"><div className="kpi-title">{isArabic ? 'متوسط زمن الاستجابة' : 'Avg Response Time'}</div><div className="kpi-value">{kpis.avgResponseTime}</div></div>
            <div className="kpi-card"><div className="kpi-title">{isArabic ? 'مهام قيد التنفيذ' : 'Tasks in Progress'}</div><div className="kpi-value">{kpis.tasksInProgress}</div></div>
            <div className="kpi-card"><div className="kpi-title">CSAT</div><div className="kpi-value">{kpis.csat}</div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mb-3 overflow-x-auto">
          {[
            { key: 'overview', label: isArabic ? 'نظرة عامة' : 'Overview' },
            { key: 'teams', label: isArabic ? 'الفرق' : 'Teams' },
            { key: 'employees', label: isArabic ? 'الموظفون' : 'Employees' },
            { key: 'tickets', label: isArabic ? 'التذاكر/الليدز' : 'Tickets / Leads' },
            { key: 'tasks', label: isArabic ? 'المهام' : 'Tasks' },
            { key: 'analytics', label: isArabic ? 'تحليلات وتقارير' : 'Analytics & Reports' },
          ].map(t => (
            <button
              key={t.key}
              className={`pb-2 text-sm whitespace-nowrap ${tab===t.key ? 'border-b-2 border-white text-white' : 'text-[var(--muted-text)]'}`}
              onClick={()=>setTab(t.key)}
            >
              <span className="inline-flex items-center gap-2">
                {renderTabIcon(t.key)}
                <span>{t.label}</span>
              </span>
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-2">{isArabic ? 'معلومات القسم' : 'Department Info'}</h3>
            <p className="text-sm">{isArabic ? 'هيكل القسم: قسم → فرق → مستخدمون' : 'Department tree: Department → Teams → Users'}</p>
          </div>
        )}

        {tab === 'teams' && (
           <div className="glass-panel rounded-xl overflow-x-auto">
            <table className="nova-table w-full">
              <thead>
                <tr className="thead-soft">
                  <th>ID</th>
                  <th>Name</th>
                  <th>Leader</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.name}</td>
                    <td>{t.leader?.name || '-'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-ghost btn-square p-1" title={isArabic ? 'تعديل' : 'Edit'}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {teams.length === 0 && (
                    <tr>
                        <td colSpan="4" className="text-center py-4 text-[var(--muted-text)]">
                            {isArabic ? 'لا توجد فرق' : 'No teams found'}
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
             <div className="flex items-center gap-2 p-3">
              <button className="btn btn-primary">{isArabic ? 'إضافة فريق' : 'Add Team'}</button>
            </div>
           </div>
        )}

        {tab === 'employees' && (
          <div className="glass-panel rounded-xl overflow-x-auto">
            <table className="nova-table w-full">
              <thead>
                <tr className="thead-soft">
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.name}</td>
                    <td>{u.roles?.[0]?.name || '-'}</td>
                    <td>{u.team?.name || '-'}</td>
                    <td>{u.is_active ? 'Active' : 'Inactive'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-ghost btn-square p-1" title={isArabic ? 'تعيين فريق' : 'Assign Team'} aria-label={isArabic ? 'تعيين فريق' : 'Assign Team'}>
                          {/* users icon */}
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                        </button>
                        <button className="btn btn-ghost btn-square p-1" title={isArabic ? 'عرض البروفايل' : 'View Profile'} aria-label={isArabic ? 'عرض البروفايل' : 'View Profile'}>
                          {/* user icon */}
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                 {users.length === 0 && (
                    <tr>
                        <td colSpan="6" className="text-center py-4 text-[var(--muted-text)]">
                            {isArabic ? 'لا يوجد موظفين' : 'No employees found'}
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center gap-2 p-3">
              <button className="btn btn-primary">{isArabic ? 'إضافة مستخدم للقسم' : 'Add user to department'}</button>
              <button className="btn btn-ghost">{isArabic ? 'نقل مستخدم بين الفرق' : 'Move user between teams'}</button>
            </div>
          </div>
        )}

        {tab === 'tickets' && (
          <div className="glass-panel rounded-xl overflow-x-auto">
            <div className="p-3 flex flex-wrap items-center gap-2">
              <SearchableSelect
                className="w-40"
                options={ticketTypes.map(o => ({ value: o, label: o }))}
                value={ticketFilters.type}
                onChange={(v) => setTicketFilters(prev => ({ ...prev, type: v }))}
                placeholder={isArabic ? "النوع" : "Type"}
                multiple={true}
                isRTL={isArabic}
              />
              <SearchableSelect
                className="w-44"
                options={ticketStatuses.map(o => ({ value: o, label: o }))}
                value={ticketFilters.status}
                onChange={(v) => setTicketFilters(prev => ({ ...prev, status: v }))}
                placeholder={isArabic ? "الحالة" : "Status"}
                multiple={true}
                isRTL={isArabic}
              />
              <SearchableSelect
                className="w-44"
                options={ticketPriorities.map(o => ({ value: o, label: o }))}
                value={ticketFilters.priority}
                onChange={(v) => setTicketFilters(prev => ({ ...prev, priority: v }))}
                placeholder={isArabic ? "الأولوية" : "Priority"}
                multiple={true}
                isRTL={isArabic}
              />
            </div>
            <table className="nova-table w-full">
              <thead>
                <tr className="thead-soft">
                  <th>ID</th>
                  <th>{isArabic ? "النوع" : "Type"}</th>
                  <th>{isArabic ? "الأولوية" : "Priority"}</th>
                  <th>{isArabic ? "تم تعيينه لـ" : "Assigned To"}</th>
                  <th>{isArabic ? "الحالة" : "Status"}</th>
                  <th>{isArabic ? "تاريخ الإنشاء" : "Created At"}</th>
                  <th>{isArabic ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.type || 'Ticket'}</td>
                    <td>{t.priority}</td>
                    <td>{t.assignedTo?.name || '-'}</td>
                    <td>{t.status}</td>
                    <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-ghost btn-square p-1" title={isArabic ? 'عرض' : 'View'} aria-label={isArabic ? 'عرض' : 'View'}>
                          {/* eye icon */}
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                        <button className="btn btn-ghost btn-square p-1" title={isArabic ? 'إعادة تعيين' : 'Reassign'} aria-label={isArabic ? 'إعادة تعيين' : 'Reassign'}>
                          {/* refresh-cw icon */}
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                 {filteredTickets.length === 0 && (
                    <tr>
                        <td colSpan="7" className="text-center py-4 text-[var(--muted-text)]">
                            {isArabic ? 'لا توجد تذاكر' : 'No tickets found'}
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'tasks' && (
          <div className="glass-panel rounded-xl overflow-x-auto">
            <table className="nova-table w-full">
              <thead>
                <tr className="thead-soft">
                  <th>Task ID</th>
                  <th>Title</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id}>
                    <td>{task.id}</td>
                    <td>{task.title}</td>
                    <td>{task.assignedTo?.name || '-'}</td>
                    <td>{task.status}</td>
                    <td>{task.due_date}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-ghost btn-square p-1" title={isArabic ? 'إضافة مهمة' : 'Add Task'} aria-label={isArabic ? 'إضافة مهمة' : 'Add Task'}>
                          {/* plus-square icon */}
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="12" y1="8" x2="12" y2="16"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                          </svg>
                        </button>
                        <button className="btn btn-ghost btn-square p-1" title={isArabic ? 'إعادة تعيين' : 'Reassign'} aria-label={isArabic ? 'إعادة تعيين' : 'Reassign'}>
                          {/* refresh-cw icon */}
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
                            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                 {tasks.length === 0 && (
                    <tr>
                        <td colSpan="6" className="text-center py-4 text-[var(--muted-text)]">
                            {isArabic ? 'لا توجد مهام' : 'No tasks found'}
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-2">{isArabic ? 'المغلق من التيكتس' : 'Tickets closed'}</h3>
                <div className="h-64 flex items-center justify-center text-[var(--muted-text)]">
                   {/* Placeholder for chart */}
                   Coming Soon
                </div>
              </div>
          </div>
        )}

      </div>
       {/* Modal */}
       {showEditModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-[var(--muted-text)] hover:text-white"
            >
              <X size={20} />
            </button>
            <UserManagementDepartmentForm 
              initialData={dept}
              mode="edit"
              onClose={() => setShowEditModal(false)}
              onSuccess={(updatedDept) => {
                  setDept(prev => ({...prev, ...updatedDept}))
                  setShowEditModal(false)
                  fetchData()
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </Layout>
  )
}
