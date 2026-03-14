import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

/**
 * Central unified assignment modal
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onSubmit: (payload) => void
 * - context: 'task' | 'lead' | 'ticket' | 'user'
 * - teams: Array<{ id: string, name: string }>
 * - users: Array<{ id: string, fullName: string, team?: string, role?: string }>
 * - defaultAssignType?: 'team' | 'user'
 * - defaultTargetId?: string // teamId or userId
 */
export default function AssignmentModal({
  open,
  onClose,
  onSubmit,
  context = 'task',
  teams = [],
  users = [],
  leads = [],
  customers = [],
  defaultAssignType = 'team',
  defaultTargetId,
  defaultTargetIds = [],
}) {
  const { i18n } = useTranslation()
  const allowMultiAssign = context === 'task' || context === 'ticket' || (defaultTargetIds && defaultTargetIds.length > 0)

  const [assignType, setAssignType] = useState(defaultAssignType)
  const [teamId, setTeamId] = useState(defaultAssignType === 'team' ? defaultTargetId || teams[0]?.id : '')
  const [userId, setUserId] = useState(defaultAssignType === 'user' ? defaultTargetId || users[0]?.id : '')
  const [teamIds, setTeamIds] = useState(defaultAssignType === 'team' && defaultTargetId ? [defaultTargetId] : [])
  const [userIds, setUserIds] = useState(
    defaultAssignType === 'user' 
      ? (defaultTargetIds.length > 0 ? defaultTargetIds : (defaultTargetId ? [defaultTargetId] : [])) 
      : []
  )
  const [leadId, setLeadId] = useState(leads[0]?.id || '')
  const [customerId, setCustomerId] = useState('')
  
  // Task specific states
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [taskType, setTaskType] = useState('visit')
  const [relatedType, setRelatedType] = useState('')
  const [relatedRef, setRelatedRef] = useState('')
  const [reminderBefore, setReminderBefore] = useState('')
  const [recurring, setRecurring] = useState('none')
  const [attachment, setAttachment] = useState(null)
  
  // Ticket specific states
  const [ticketStatus, setTicketStatus] = useState('Open')
  const [ticketType, setTicketType] = useState('Inquiry')
  const [channel, setChannel] = useState('Email')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
  const [slaDeadline, setSlaDeadline] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [assignIndividually, setAssignIndividually] = useState(true)

  // General notes for other contexts
  const [notes, setNotes] = useState('')

  const isAr = i18n?.language === 'ar'
  
  // Memoized options similar to NewTaskModal
  const taskTypes = useMemo(() => ['visit', 'mission', 'delivery', 'email', 'meeting', 'call'], [])
  const ticketStatusOptions = useMemo(() => ['Open', 'In Progress', 'Escalated', 'Closed'], [])
  const ticketTypeOptions = useMemo(() => ['Complaint', 'Inquiry', 'Request'], [])
  const channelOptions = useMemo(() => ['Email', 'Phone', 'WhatsApp', 'Customer Portal', 'Social Media'], [])
  
  const relatedModules = useMemo(() => ['Lead', 'Deal', 'Contact', 'Opportunity', 'Ticket', 'Project'], [])
  const reminderOptions = useMemo(() => [
    { value: '5m', label: isAr ? 'قبل 5 دقائق' : '5 minutes before' },
    { value: '15m', label: isAr ? 'قبل 15 دقيقة' : '15 minutes before' },
    { value: '30m', label: isAr ? 'قبل 30 دقيقة' : '30 minutes before' },
    { value: '1h', label: isAr ? 'قبل ساعة' : '1 hour before' },
    { value: '2h', label: isAr ? 'قبل ساعتين' : '2 hours before' },
    { value: '1d', label: isAr ? 'قبل يوم' : '1 day before' }
  ], [isAr])
  const recurringOptions = useMemo(() => [
    { value: 'none', label: isAr ? 'بدون' : 'None' },
    { value: 'daily', label: isAr ? 'يومي' : 'Daily' },
    { value: 'weekly', label: isAr ? 'أسبوعي' : 'Weekly' },
    { value: 'monthly', label: isAr ? 'شهري' : 'Monthly' }
  ], [isAr])

  const labels = useMemo(() => ({
    title: isAr ? (context === 'task' ? 'إسناد مهمة جماعية' : 'مركز التعيين') : (context === 'task' ? 'Bulk Task Assignment' : 'Assignment Center'),
    close: isAr ? 'إغلاق' : 'Close',
    assignType: isAr ? 'نوع المُستهدف' : 'Assign Type',
    team: isAr ? 'فريق' : 'Team',
    user: isAr ? 'مستخدم' : 'User',
    teams: isAr ? (allowMultiAssign ? 'الفرق' : 'الفريق') : (allowMultiAssign ? 'Teams' : 'Team'),
    users: isAr ? (allowMultiAssign ? 'المستخدمون' : 'المستخدم') : (allowMultiAssign ? 'Users' : 'User'),
    lead: isAr ? 'ليد' : 'Lead',
    noLeads: isAr ? 'لا توجد ليد متاحة' : 'No leads available',
    priority: isAr ? 'الأولوية' : 'Priority',
    priorityOptions: isAr ? ['منخفضة','عادية','مرتفعة','حرِجة'] : ['Low','Normal','High','Critical'],
    deadline: isAr ? 'تاريخ الاستحقاق' : 'Due Date',
    startDate: isAr ? 'تاريخ البداية' : 'Start Date',
    notes: isAr ? 'ملاحظات' : 'Notes',
    taskTitle: isAr ? 'عنوان المهمة' : 'Task Title',
    taskDesc: isAr ? 'وصف المهمة' : 'Task Description',
    taskType: isAr ? 'نوع المهمة' : 'Task Type',
    relatedTo: isAr ? 'مرتبط بـ' : 'Related to',
    refId: isAr ? 'مرجع/رقم' : 'Reference/ID',
    reminder: isAr ? 'تذكير' : 'Reminder',
    recurring: isAr ? 'تكرار' : 'Recurring',
    attachment: isAr ? 'ملف مرفق' : 'Attachment',
    cancel: isAr ? 'إلغاء' : 'Cancel',
    assign: isAr ? 'تعيين' : 'Assign',
    selectedSuffix: isAr ? 'محدد/ة' : 'selected',
    badgePrefixTeam: isAr ? 'فريق' : 'Team',
    badgePrefixUser: isAr ? 'مستخدم' : 'User',
    contextLabel: {
      task: isAr ? 'تاسك' : 'Task',
      lead: isAr ? 'ليد' : 'Lead',
      ticket: isAr ? 'تيكت' : 'Ticket',
      user: isAr ? 'مستخدم' : 'User',
    },
    subject: isAr ? 'الموضوع' : 'Subject',
    ticketType: isAr ? 'نوع التذكرة' : 'Ticket Type',
    ticketStatus: isAr ? 'الحالة' : 'Status',
    channel: isAr ? 'القناة' : 'Channel',
    customer: isAr ? 'العميل' : 'Customer',
    contactPhone: isAr ? 'رقم الاتصال' : 'Contact Phone',
    contactEmail: isAr ? 'البريد الإلكتروني' : 'Contact Email',
    contactWhatsapp: isAr ? 'واتساب' : 'WhatsApp',
    slaDeadline: isAr ? 'موعد SLA' : 'SLA Deadline',
    resolutionNotes: isAr ? 'ملاحظات الحل' : 'Resolution Notes',
    assignIndividually: isAr ? 'إنشاء تذكرة منفصلة لكل مستخدم' : 'Create separate ticket for each user',
  }), [isAr, allowMultiAssign, context])

  const targetName = useMemo(() => {
    if (assignType === 'team') {
      if (allowMultiAssign) {
        const selected = teams.filter(t => teamIds.includes(t.id))
        if (selected.length === 0) return ''
        if (selected.length <= 2) return selected.map(t => t.name).join(', ')
        return `${selected.length} ${labels.selectedSuffix}`
      }
      const t = teams.find(t => t.id === (teamId || defaultTargetId))
      return t?.name || ''
    }
    if (allowMultiAssign) {
      const selected = users.filter(u => userIds.includes(u.id))
      if (selected.length === 0) return ''
      if (selected.length <= 2) return selected.map(u => u.fullName).join(', ')
      return `${selected.length} ${labels.selectedSuffix}`
    }
    const u = users.find(u => u.id === (userId || defaultTargetId))
    return u?.fullName || ''
  }, [assignType, teamId, userId, teams, users, defaultTargetId, allowMultiAssign, teamIds, userIds, labels.selectedSuffix])

  const filteredUsers = useMemo(() => {
    if (!teamId) return users
    return users.filter(u => !u.team || u.team === teamId || u.team === teams.find(t => t.id === teamId)?.name)
  }, [users, teamId, teams])

  const leadName = useMemo(() => {
    if (!leadId) return ''
    const l = leads.find(l => l.id === leadId)
    return l?.name || l?.full_name || ''
  }, [leadId, leads])
  const customerName = useMemo(() => {
    if (!customerId) return ''
    const c = customers.find(c => c.id === customerId)
    return c?.name || ''
  }, [customerId, customers])

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState(false)
  const [leadSearchTerm, setLeadSearchTerm] = useState('')
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')

  const filteredLeads = useMemo(() => {
    if (!leadSearchTerm) return leads
    const lower = leadSearchTerm.toLowerCase()
    return leads.filter(l => (l.name || l.full_name || '').toLowerCase().includes(lower))
  }, [leads, leadSearchTerm])
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm) return customers
    const lower = customerSearchTerm.toLowerCase()
    return customers.filter(c => (c.name || '').toLowerCase().includes(lower) || (c.phone || '').toLowerCase().includes(lower) || (String(c.id || '')).toLowerCase().includes(lower))
  }, [customers, customerSearchTerm])

  // Combined options for unified select
  const assignOptions = useMemo(() => {
    const opts = []
    // Add Users
    users.forEach(u => {
      opts.push({
        value: u.id,
        label: u.fullName + (u.team ? ` (${u.team})` : ''),
        type: 'user',
        original: u
      })
    })
    // Add Teams (if any)
    teams.forEach(t => {
      opts.push({
        value: t.id,
        label: t.name,
        type: 'team',
        original: t
      })
    })
    return opts
  }, [users, teams])

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return assignOptions
    const lower = searchTerm.toLowerCase()
    return assignOptions.filter(o => o.label.toLowerCase().includes(lower))
  }, [assignOptions, searchTerm])

  const toggleSelection = (option) => {
    // If selecting a team, clear user selection if not multi-type (usually we don't mix)
    // But to keep it simple, we just manage the IDs.
    
    // Logic: 
    // If option.type is 'team', we update teamIds/teamId
    // If option.type is 'user', we update userIds/userId
    
    // Auto-switch assignType based on last interaction if single select
    // If multi select, we can technically have both, but let's see.
    
    if (allowMultiAssign) {
      if (option.type === 'team') {
        setAssignType('team') // bias towards team if team selected?
        const newIds = teamIds.includes(option.value)
          ? teamIds.filter(id => id !== option.value)
          : [...teamIds, option.value]
        setTeamIds(newIds)
        // Optionally clear users if we want strict separation? 
        // Let's keep it flexible: if they pick a team, we don't necessarily clear users, 
        // but the submit logic sends one or the other based on assignType.
        // So we should probably update assignType to match what's being selected.
        // If they select a Team, assignType becomes team. 
      } else {
        setAssignType('user')
        const newIds = userIds.includes(option.value)
          ? userIds.filter(id => id !== option.value)
          : [...userIds, option.value]
        setUserIds(newIds)
      }
    } else {
      // Single select
      if (option.type === 'team') {
        setAssignType('team')
        setTeamId(option.value)
        setUserId('')
        setTeamIds([option.value]) // sync multi states just in case
        setUserIds([])
      } else {
        setAssignType('user')
        setUserId(option.value)
        setTeamId('')
        setUserIds([option.value])
        setTeamIds([])
      }
      setIsDropdownOpen(false)
    }
  }

  const removeSelection = (e, type, id) => {
    e.stopPropagation()
    if (type === 'team') {
      if (allowMultiAssign) {
        setTeamIds(teamIds.filter(tid => tid !== id))
      } else {
        setTeamId('')
      }
    } else {
      if (allowMultiAssign) {
        setUserIds(userIds.filter(uid => uid !== id))
      } else {
        setUserId('')
      }
    }
  }

  // Helper to render selected tags
  const renderSelectedTags = () => {
    const tags = []
    
    if (allowMultiAssign) {
       // Show selected teams
       teamIds.forEach(tid => {
         const t = teams.find(team => team.id === tid)
         if (t) tags.push({ id: tid, label: t.name, type: 'team' })
       })
       // Show selected users
       userIds.forEach(uid => {
         const u = users.find(user => user.id === uid)
         if (u) tags.push({ id: uid, label: u.fullName, type: 'user' })
       })
    } else {
       if (assignType === 'team' && teamId) {
         const t = teams.find(team => team.id === teamId)
         if (t) tags.push({ id: teamId, label: t.name, type: 'team' })
       } else if (assignType === 'user' && userId) {
         const u = users.find(user => user.id === userId)
         if (u) tags.push({ id: userId, label: u.fullName, type: 'user' })
       }
    }

    if (tags.length === 0) return <span className="text-gray-400">{isAr ? 'اختر...' : 'Select...'}</span>

    return (
      <div className="flex flex-wrap gap-1">
        {tags.map(tag => (
          <span key={`${tag.type}-${tag.id}`} className="badge badge-sm badge-info gap-1 h-auto py-1">
            {tag.type === 'team' && <span className="text-[10px] opacity-70">[{labels.team}]</span>}
            {tag.label}
            <button onClick={(e) => removeSelection(e, tag.type, tag.id)} className="btn btn-xs btn-ghost btn-circle h-4 w-4 min-h-0 p-0 ml-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          </span>
        ))}
      </div>
    )
  }

  // Click outside handler for dropdown (simple implementation)
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.custom-multiselect')) {
        setIsDropdownOpen(false)
      }
      if (isLeadDropdownOpen && !event.target.closest('.custom-lead-select')) {
        setIsLeadDropdownOpen(false)
      }
      if (isCustomerDropdownOpen && !event.target.closest('.custom-customer-select')) {
        setIsCustomerDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isDropdownOpen, isLeadDropdownOpen, isCustomerDropdownOpen])


  if (!open) return null

  const hasSelection = assignType === 'team'
    ? (allowMultiAssign ? teamIds.length > 0 : !!teamId)
    : (allowMultiAssign ? userIds.length > 0 : !!userId)

  const requiresLead = context === 'lead'
  const canSubmit = hasSelection && (!requiresLead || !!leadId) && (context === 'task' ? !!taskTitle.trim() : (context === 'ticket' ? !!taskTitle.trim() : true))

  const submit = () => {
    const payload = {
      context,
      assignType,
      teamId: assignType === 'team' && !allowMultiAssign ? teamId : undefined,
      userId: assignType === 'user' && !allowMultiAssign ? userId : undefined,
      teamIds: assignType === 'team' && allowMultiAssign ? teamIds : undefined,
      userIds: assignType === 'user' && allowMultiAssign ? userIds : undefined,
      targetName,
      leadId: context === 'lead' ? leadId : undefined,
      leadName: context === 'lead' ? leadName : undefined,
      priority,
      deadline,
      // Task specific fields
      title: taskTitle,
      description: taskDescription,
      startDate,
      taskType,
      relatedType,
      relatedRef,
      reminderBefore,
      recurring,
      attachment,
      notes,
      // Ticket specific fields
      ticketStatus,
      ticketType,
      channel,
      customerId,
      customerName: customerName || undefined,
      contactPhone,
      contactEmail,
      contactWhatsapp,
      slaDeadline,
      resolutionNotes,
      assignIndividually: (allowMultiAssign && hasSelection) ? assignIndividually : false
    }
    onSubmit?.(payload)
    onClose?.()
  }

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) { setAttachment(null); return; }
    const url = URL.createObjectURL(file);
    setAttachment({ name: file.name, size: file.size, type: file.type, url });
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative card w-full max-w-2xl glass-panel rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-base-200">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">{labels.title}</h3>
            {!!targetName && (
              <span className="badge badge-outline">{assignType==='team' ? labels.badgePrefixTeam : labels.badgePrefixUser}: {targetName}</span>
            )}
          </div>
          <button className="btn btn-circle btn-ghost btn-sm" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="mb-4 text-sm opacity-70 bg-base-200/50 p-2 rounded-lg">
            {isAr ? `السياق: ${labels.contextLabel[context]}` : `Context: ${labels.contextLabel[context]}`}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unified Assignment Target Section */}
            <div className="md:col-span-2 border-b border-base-200 pb-4 mb-2">
               <label className="label-text text-xs opacity-70 mb-1 block">{isAr ? 'تعيين إلى (مستخدمين / فرق)' : 'Assign To (Users / Teams)'}</label>
               
               {/* Custom Multi-Select Dropdown */}
               <div className="relative custom-multiselect">
                 {/* Trigger */}
                 <div 
                   className="min-h-[42px] border border-base-300 rounded-lg p-2 bg-[var(--dropdown-bg)] cursor-pointer hover:border-base-400 transition-colors flex items-center"
                   onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                 >
                   {renderSelectedTags()}
                   <div className="ml-auto pl-2 opacity-50">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                     </svg>
                   </div>
                 </div>

                 {/* Dropdown Menu */}
                 {isDropdownOpen && (
                   <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-200 rounded-lg shadow-xl z-50 max-h-60 flex flex-col">
                     <div className="p-2 border-b border-base-200">
                       <input 
                         type="text" 
                         className="input input-sm input-bordered w-full" 
                         placeholder={isAr ? 'بحث...' : 'Search...'}
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         autoFocus
                         onClick={(e) => e.stopPropagation()}
                       />
                     </div>
                     <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                       {filteredOptions.length === 0 ? (
                         <div className="p-2 text-center text-sm opacity-50">{isAr ? 'لا توجد نتائج' : 'No results found'}</div>
                       ) : (
                         filteredOptions.map(option => {
                           const isSelected = option.type === 'team' 
                             ? (allowMultiAssign ? teamIds.includes(option.value) : teamId === option.value)
                             : (allowMultiAssign ? userIds.includes(option.value) : userId === option.value)
                           
                           return (
                             <div 
                               key={`${option.type}-${option.value}`}
                               className={`flex items-center gap-2 p-2 hover:bg-base-200 rounded cursor-pointer ${isSelected ? 'bg-blue-50 text-blue-700' : ''}`}
                               onClick={(e) => {
                                 e.stopPropagation()
                                 toggleSelection(option)
                               }}
                             >
                               <input 
                                 type="checkbox" 
                                 className="checkbox checkbox-xs checkbox-primary" 
                                 checked={isSelected}
                                 readOnly
                               />
                               <div className="flex flex-col">
                                 <span className="text-sm font-medium">{option.label}</span>
                                 <span className="text-[10px] opacity-60 uppercase tracking-wider">{option.type === 'team' ? labels.team : labels.user}</span>
                               </div>
                             </div>
                           )
                         })
                       )}
                     </div>
                   </div>
                 )}
               </div>
            </div>

            {/* Task Specific Fields */}
            {context === 'task' && (
              <>
                <div className="md:col-span-2 space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.taskTitle}</label>
                  <input className="input input-bordered w-full bg-[var(--dropdown-bg)]" value={taskTitle} onChange={(e)=>setTaskTitle(e.target.value)} placeholder={labels.taskTitle} />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.taskDesc}</label>
                  <textarea className="textarea textarea-bordered w-full bg-[var(--dropdown-bg)] min-h-[100px]" value={taskDescription} onChange={(e)=>setTaskDescription(e.target.value)} placeholder={labels.taskDesc} />
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.priority}</label>
                  <select className="select select-bordered w-full bg-[var(--dropdown-bg)]" value={priority} onChange={(e)=>setPriority(e.target.value)}>
                     <option value="low">{isAr ? 'منخفضة' : 'Low'}</option>
                     <option value="medium">{isAr ? 'متوسطة' : 'Medium'}</option>
                     <option value="high">{isAr ? 'عالية' : 'High'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.taskType}</label>
                  <select className="select select-bordered w-full bg-[var(--dropdown-bg)]" value={taskType} onChange={(e)=>setTaskType(e.target.value)}>
                    {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.startDate}</label>
                  <input type="date" className="input input-bordered w-full bg-[var(--dropdown-bg)]" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.deadline}</label>
                  <input type="date" className="input input-bordered w-full bg-[var(--dropdown-bg)]" value={deadline} onChange={(e)=>setDeadline(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.relatedTo}</label>
                  <select className="select select-bordered w-full bg-[var(--dropdown-bg)]" value={relatedType} onChange={(e)=>setRelatedType(e.target.value)}>
                    <option value="">{isAr ? 'اختر' : 'Select'}</option>
                    {relatedModules.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.refId}</label>
                  <input className="input input-bordered w-full bg-[var(--dropdown-bg)]" value={relatedRef} onChange={(e)=>setRelatedRef(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.reminder}</label>
                  <select className="select select-bordered w-full bg-[var(--dropdown-bg)]" value={reminderBefore} onChange={(e)=>setReminderBefore(e.target.value)}>
                    {reminderOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.recurring}</label>
                  <select className="select select-bordered w-full bg-[var(--dropdown-bg)]" value={recurring} onChange={(e)=>setRecurring(e.target.value)}>
                    {recurringOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1">
                   <label className="label-text text-xs opacity-70">{labels.attachment}</label>
                   <div className="relative">
                     <input 
                       type="file" 
                       id="task-attachment-upload" 
                       className="hidden" 
                       onChange={onFileChange} 
                     />
                     <label 
                       htmlFor="task-attachment-upload" 
                       className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-base-300 rounded-lg cursor-pointer hover:bg-base-200/50 hover:border-primary/50 transition-all bg-[var(--dropdown-bg)]"
                     >
                       {attachment ? (
                         <div className="flex flex-col items-center text-center p-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium break-all max-w-[200px] truncate">{attachment.name}</span>
                            <span className="text-[10px] opacity-50 mt-1 uppercase tracking-wider">{(attachment.size / 1024).toFixed(1)} KB</span>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center text-center p-4 text-base-content/50 hover:text-primary transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                           </svg>
                           <span className="text-xs font-medium">{isAr ? 'اضغط لرفع ملف' : 'Click to upload file'}</span>
                         </div>
                       )}
                     </label>
                     {attachment && (
                       <button 
                         onClick={(e) => {
                           e.preventDefault(); 
                           setAttachment(null);
                           const input = document.getElementById('task-attachment-upload');
                           if(input) input.value = '';
                         }}
                         className="absolute top-2 right-2 btn btn-circle btn-ghost btn-xs text-error bg-base-100 shadow-sm hover:bg-error/10"
                         title={isAr ? 'إزالة' : 'Remove'}
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                         </svg>
                       </button>
                     )}
                   </div>
                </div>
              </>
            )}

            {/* Ticket Specific Fields */}
            {context === 'ticket' && (
              <>
                <div className="md:col-span-2 space-y-1">
                  <label className="label-text text-xs opacity-70 mb-1 block">{labels.customer}</label>
                  <div 
                    className="relative custom-customer-select"
                  >
                    <div 
                      className="min-h-[42px] border border-base-300 rounded-lg p-2 bg-[var(--dropdown-bg)] cursor-pointer hover:border-base-400 transition-colors flex items-center justify-between"
                      onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                    >
                      <span className={!customerId ? 'text-gray-400' : ''}>
                        {customerId ? (customerName || labels.customer) : (isAr ? 'اختر عميل...' : 'Select Customer...')}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {isCustomerDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-200 rounded-lg shadow-xl z-50 max-h-60 flex flex-col">
                        <div className="p-2 border-b border-base-200">
                          <input 
                            type="text" 
                            className="input input-sm input-bordered w-full" 
                            placeholder={isAr ? 'بحث...' : 'Search...'}
                            value={customerSearchTerm}
                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-2 text-center text-sm opacity-50">{isAr ? 'لا توجد نتائج' : 'No results found'}</div>
                          ) : (
                            filteredCustomers.map(c => (
                              <div 
                                key={c.id}
                                className={`flex items-center gap-2 p-2 hover:bg-base-200 rounded cursor-pointer ${customerId === c.id ? 'bg-blue-50 text-blue-700' : ''}`}
                                onClick={() => {
                                  setCustomerId(c.id)
                                  setIsCustomerDropdownOpen(false)
                                }}
                              >
                                <span className="text-sm font-medium">{c.name || `Customer ${c.id}`}</span>
                                <span className="text-[10px] opacity-60">{c.phone || ''}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.subject}</label>
                  <input className="input input-bordered w-full bg-[var(--dropdown-bg)]" value={taskTitle} onChange={(e)=>setTaskTitle(e.target.value)} placeholder={labels.subject} />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.taskDesc}</label>
                  <textarea className="textarea textarea-bordered w-full bg-[var(--dropdown-bg)] min-h-[100px]" value={taskDescription} onChange={(e)=>setTaskDescription(e.target.value)} placeholder={labels.taskDesc} />
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.ticketType}</label>
                  <select className="select select-bordered w-full bg-[var(--dropdown-bg)]" value={ticketType} onChange={(e)=>setTicketType(e.target.value)}>
                    {ticketTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.ticketStatus}</label>
                  <select className="select select-bordered w-full bg-[var(--dropdown-bg)]" value={ticketStatus} onChange={(e)=>setTicketStatus(e.target.value)}>
                    {ticketStatusOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.priority}</label>
                  <select className="select select-bordered w-full bg-[var(--dropdown-bg)]" value={priority} onChange={(e)=>setPriority(e.target.value)}>
                     <option value="Low">{isAr ? 'منخفضة' : 'Low'}</option>
                     <option value="Medium">{isAr ? 'متوسطة' : 'Medium'}</option>
                     <option value="High">{isAr ? 'عالية' : 'High'}</option>
                     <option value="Urgent">{isAr ? 'حرِجة' : 'Urgent'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.channel}</label>
                  <select className="select select-bordered w-full bg-[var(--dropdown-bg)]" value={channel} onChange={(e)=>setChannel(e.target.value)}>
                    {channelOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.contactPhone}</label>
                  <input className="input input-bordered w-full bg-[var(--dropdown-bg)]" value={contactPhone} onChange={(e)=>setContactPhone(e.target.value)} placeholder={labels.contactPhone} />
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.contactEmail}</label>
                  <input className="input input-bordered w-full bg-[var(--dropdown-bg)]" value={contactEmail} onChange={(e)=>setContactEmail(e.target.value)} placeholder={labels.contactEmail} />
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.contactWhatsapp}</label>
                  <input className="input input-bordered w-full bg-[var(--dropdown-bg)]" value={contactWhatsapp} onChange={(e)=>setContactWhatsapp(e.target.value)} placeholder={labels.contactWhatsapp} />
                </div>

                <div className="space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.slaDeadline}</label>
                  <input type="datetime-local" className="input input-bordered w-full bg-[var(--dropdown-bg)]" value={slaDeadline} onChange={(e)=>setSlaDeadline(e.target.value)} />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.resolutionNotes}</label>
                  <textarea className="textarea textarea-bordered w-full bg-[var(--dropdown-bg)] min-h-[80px]" value={resolutionNotes} onChange={(e)=>setResolutionNotes(e.target.value)} placeholder={labels.resolutionNotes} />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="label-text text-xs opacity-70">{labels.attachment}</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      id="ticket-attachment-upload" 
                      className="hidden" 
                      onChange={onFileChange} 
                    />
                    <label 
                      htmlFor="ticket-attachment-upload" 
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-base-300 rounded-lg cursor-pointer hover:bg-base-200/50 hover:border-primary/50 transition-all bg-[var(--dropdown-bg)]"
                    >
                      {attachment ? (
                        <div className="flex flex-col items-center text-center p-4 animate-in fade-in zoom-in-95 duration-200">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium break-all max-w-[200px] truncate">{attachment.name}</span>
                          <span className="text-[10px] opacity-50 mt-1 uppercase tracking-wider">{(attachment.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-center p-4 text-base-content/50 hover:text-primary transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-xs font-medium">{isAr ? 'اضغط لرفع ملف' : 'Click to upload file'}</span>
                        </div>
                      )}
                    </label>
                    {attachment && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault(); 
                          setAttachment(null);
                          const input = document.getElementById('ticket-attachment-upload');
                          if(input) input.value = '';
                        }}
                        className="absolute top-2 right-2 btn btn-circle btn-ghost btn-xs text-error bg-base-100 shadow-sm hover:bg-error/10"
                        title={isAr ? 'إزالة' : 'Remove'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {allowMultiAssign && (userIds.length > 1 || teamIds.length > 0) && (
                   <div className="md:col-span-2">
                     <label className="cursor-pointer flex items-center gap-2 p-2 rounded hover:bg-base-200">
                       <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={assignIndividually} onChange={(e) => setAssignIndividually(e.target.checked)} />
                       <span className="label-text font-medium">{labels.assignIndividually}</span>
                     </label>
                   </div>
                )}
              </>
            )}

            {(context !== 'task' && context !== 'ticket') && (
              // Fallback for other contexts (Lead, User)
              <>
                {context === 'lead' && (
                  <div className="md:col-span-1 relative custom-lead-select">
                    <label className="label-text text-xs opacity-70 mb-1 block">{labels.lead}</label>
                    <div 
                      className="min-h-[42px] border border-base-300 rounded-lg p-2 bg-[var(--dropdown-bg)] cursor-pointer hover:border-base-400 transition-colors flex items-center justify-between"
                      onClick={() => setIsLeadDropdownOpen(!isLeadDropdownOpen)}
                    >
                      <span className={!leadId ? 'text-gray-400' : ''}>
                        {leadId ? (leadName || labels.lead) : (isAr ? 'اختر ليد...' : 'Select Lead...')}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>

                    {isLeadDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-base-100 border border-base-200 rounded-lg shadow-xl z-50 max-h-60 flex flex-col">
                        <div className="p-2 border-b border-base-200">
                          <input 
                            type="text" 
                            className="input input-sm input-bordered w-full" 
                            placeholder={isAr ? 'بحث...' : 'Search...'}
                            value={leadSearchTerm}
                            onChange={(e) => setLeadSearchTerm(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                          {filteredLeads.length === 0 ? (
                            <div className="p-2 text-center text-sm opacity-50">{isAr ? 'لا توجد نتائج' : 'No results found'}</div>
                          ) : (
                            filteredLeads.map(l => (
                              <div 
                                key={l.id}
                                className={`flex items-center gap-2 p-2 hover:bg-base-200 rounded cursor-pointer ${leadId === l.id ? 'bg-blue-50 text-blue-700' : ''}`}
                                onClick={() => {
                                  setLeadId(l.id)
                                  setIsLeadDropdownOpen(false)
                                }}
                              >
                                <span className="text-sm font-medium">{l.name || l.full_name || `Lead ${l.id}`}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {context !== 'user' && (
                  <>
                    <label className="form-control">
                      <span className="label-text text-xs opacity-70 mb-1">{labels.priority}</span>
                      <select className="select select-bordered w-full bg-[var(--dropdown-bg)]" value={priority} onChange={(e)=>setPriority(e.target.value)}>
                        {labels.priorityOptions.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </label>

                    <label className="form-control">
                      <span className="label-text text-xs opacity-70 mb-1">{labels.deadline}</span>
                      <input type="date" className="input input-bordered w-full bg-[var(--dropdown-bg)]" value={deadline} onChange={(e)=>setDeadline(e.target.value)} />
                    </label>
                  </>
                )}

                <label className="form-control md:col-span-2">
                  <span className="label-text text-xs opacity-70 mb-1">{labels.notes}</span>
                  <textarea className="textarea textarea-bordered w-full bg-[var(--dropdown-bg)] min-h-[100px]" value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder={`${isAr ? 'السياق' : 'Context'}: ${labels.contextLabel[context]}${targetName ? ` — ${isAr ? 'تعيين إلى' : 'Assigning to'} ${assignType==='team'?labels.team:labels.user}: ${targetName}` : ''}`} />
                </label>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 mt-auto flex items-center justify-between gap-2 p-6 border-t border-base-200">
          <div className="text-sm opacity-70">
            {assignType==='team'
              ? (allowMultiAssign ? `${(teamIds||[]).length} ${labels.selectedSuffix}` : (teamId ? `${labels.badgePrefixTeam}: ${targetName}` : ''))
              : (allowMultiAssign ? `${(userIds||[]).length} ${labels.selectedSuffix}` : (userId ? `${labels.badgePrefixUser}: ${targetName}` : ''))
            }
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm btn-ghost hover:bg-red-50 text-red-600" onClick={onClose}>{labels.cancel}</button>
            <button className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none px-6" onClick={submit} disabled={!canSubmit}>{labels.assign}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
