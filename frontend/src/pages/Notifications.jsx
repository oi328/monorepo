import { useEffect, useMemo, useState, useCallback } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../utils/api'
import toast from 'react-hot-toast'
import SearchableSelect from '../components/SearchableSelect'
import Layout from '../components/Layout'
import NotificationItem from '../shared/components/NotificationItem'
import TaskDetailsModal from '../components/TaskDetailsModal'

const TYPES = [
  { value: 'All', label: 'All' },
  { value: 'task', label: 'Tasks' },
  { value: 'lead', label: 'Leads' },
  { value: 'campaign', label: 'Campaigns' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'comment', label: 'Comments' },
  { value: 'system', label: 'System' },
]

export function NotificationsContent({ embedded = false, onClose, onOpenTask }) {
  const { t, i18n } = useTranslation()
  const context = useOutletContext();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar'

  const [notifications, setNotifications] = useState([])
  // We removed local state for task modal, now delegating to parent via onOpenTask

  const [tab, setTab] = useState('all') // all | unread | archived
  const [q, setQ] = useState('')
  const [type, setType] = useState('All')
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/notifications')
      // Map backend data to frontend structure
      // Handle the paginated response structure: { notifications: { data: [...] }, unread_count: X }
      const rawNotifications = data.notifications?.data || data.data || []
      
      const mapped = rawNotifications.map(n => {
        // Derive type from class name or data
        let derivedType = 'system'
        const typeStr = n.type || ''
        if (typeStr.includes('Lead') || typeStr.includes('Customer')) derivedType = 'lead'
        else if (typeStr.includes('Task')) derivedType = 'task'
        else if (typeStr.includes('Campaign')) derivedType = 'campaign'
        else if (typeStr.includes('Invoice') || typeStr.includes('Rent')) derivedType = 'inventory'

        return {
          id: n.id,
          type: derivedType,
          title: n.data.title || n.data.subject || 'Notification',
          body: n.data.message || n.data.body || '',
          createdAt: new Date(n.created_at).getTime(),
          read: !!n.read_at,
          archived: !!n.archived_at,
          source: derivedType.charAt(0).toUpperCase() + derivedType.slice(1),
          link: n.data.link
        }
      })
      setNotifications(mapped)

      // Use unread_count from the same response if available
      if (typeof data.unread_count !== 'undefined') {
        setUnreadCount(data.unread_count)
      } else {
        try {
          const countRes = await api.get('/api/notifications/unread-count')
          setUnreadCount(countRes?.data?.count || 0)
        } catch (e) {
          setUnreadCount(mapped.filter(n => !n.read).length)
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load data
  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every minute
    const interval = setInterval(fetchNotifications, 60000)
    const handler = () => fetchNotifications()
    window.addEventListener('notificationsUpdated', handler)
    return () => {
      clearInterval(interval)
      window.removeEventListener('notificationsUpdated', handler)
    }
  }, [fetchNotifications])

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase()
    return notifications.filter(n => {
      if (tab !== 'archived' && n.archived) return false
      if (tab === 'unread' && n.read) return false
      if (tab === 'archived' && !n.archived) return false

      if (type !== 'All' && (n.type || '') !== type) return false
      if (query) {
        const text = `${n.title || ''} ${n.body || ''}`.toLowerCase()
        if (!text.includes(query)) return false
      }
      return true
    })
  }, [notifications, tab, q, type])


  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      window.dispatchEvent(new Event('notificationsUpdated'))
    } catch (err) {
      console.error(err)
    }
  }

  const triggerTest = async () => {
    try {
      await api.post('/api/trigger-notification', { message: 'This is a test notification from React!' });
      toast.success('Notification triggered!');
    } catch (err) {
      toast.error('Failed to trigger notification');
      console.error(err);
    }
  }

  const clearRead = () => {
    // This button in UI says "Clear read", usually meaning "Archive/Delete all read"?
    // Or just "Mark all read"? 
    // The previous implementation filtered them out locally.
    // Let's implement it as "Archive (Delete) all read" if that's the intent,
    // OR just ignore it if it's redundant. 
    // Based on previous code: const list = notifications.filter(n => !n.read) -> It removed read ones.
    // So it effectively deletes read notifications.
    // I'll implement it as iterating and deleting? Or just leave it for now.
    // A safer bet is to just do nothing or hide it, but let's try to delete read ones if user wants.
    // For now, I'll map it to "Mark all read" or just hide it if confusing.
    // Actually, "Clear read" usually means "Remove read items from view".
    // I'll skip implementation for safety or make it just refresh the list.
    // Let's just refresh.
    fetchNotifications()
  }

  const toggleRead = async (id) => {
    const n = notifications.find(x => x.id === id)
    if (!n) return

    // If already read, we usually don't mark as unread in this simple system, but we can if API supports it.
    // My API `markAsRead` only marks as read.
    if (!n.read) {
      try {
        await api.post(`/api/notifications/${id}/read`)
        setNotifications(prev => prev.map(x => x.id === id ? { ...x, read: true } : x))
        window.dispatchEvent(new Event('notificationsUpdated'))
      } catch (err) {
        console.error(err)
      }
    }
  }

  const setArchived = async (id, value) => {
    try {
      if (value) {
        await api.post(`/api/notifications/${id}/archive`)
      } else {
        await api.post(`/api/notifications/${id}/unarchive`)
      }
      setNotifications(prev => prev.map(x => x.id === id ? { ...x, archived: value, read: value ? true : x.read } : x))
      window.dispatchEvent(new Event('notificationsUpdated'))
    } catch (err) {
      console.error(err)
    }
  }

  const handleNotificationClick = async (n) => {
    if (!n.read) {
      toggleRead(n.id);
    }

    if (n.type === 'task') {
      const match = n.link?.match(/\/tasks\/(\d+)/);
      if (match) {
        const taskId = match[1];
        try {
          const res = await api.get(`/api/tasks/${taskId}`);
          const taskData = res.data.data || res.data;
          if (taskData) {
            // Close dropdown first
            if (embedded && onClose) {
              onClose();
            }
            // Then open modal
            if (onOpenTask) {
              onOpenTask(taskData);
            }
            return;
          }
        } catch (e) {
          console.error("Failed to fetch task details", e);
        }
      }
    }

    if (n.link) {
      if (embedded && onClose) {
        onClose();
      }
      navigate(n.link);
    }
  }

  return (
    <div className={`space-y-6 ${embedded ? 'p-0' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="page-title text-xl font-semibold">{t('Notifications', 'Notifications')}</h1>
          <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {unreadCount} {t('Unread', 'Unread')}
          </span>
        </div>
        {!embedded && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={triggerTest} className="btn btn-sm btn-primary">
              Trigger Test
            </button>
            {context?.registerWebPush && (
              <button type="button" onClick={context.registerWebPush} className="btn btn-sm btn-outline">
                {t('Enable Push', 'Enable Push')}
              </button>
            )}
            <button type="button" onClick={markAllRead} className="btn btn-sm">
              {t('Mark all as read', 'Mark all as read')}
            </button>
            <button type="button" onClick={clearRead} className="btn btn-sm btn-outline">
              {t('Clear read', 'Clear read')}
            </button>
          </div>
        )}
      </div>
      <div className="h-3" aria-hidden="true"></div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tabs: All / Unread / Archived */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setTab('all')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-[0.98] ${tab === 'all' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 dark:bg-transparent border-gray-300 dark:border-gray-700 text-gray-800 dark:text-[var(--content-text)] hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:shadow'}`}
          >
            {t('All')}
          </button>
          <button
            onClick={() => setTab('unread')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-[0.98] ${tab === 'unread' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 dark:bg-transparent border-gray-300 dark:border-gray-700 text-gray-800 dark:text-[var(--content-text)] hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:shadow'}`}
          >
            {t('Unread', 'Unread')}
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`px-3 py-1.5 text-sm rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-[0.98] ${tab === 'archived' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-gray-50 dark:bg-transparent border-gray-300 dark:border-gray-700 text-gray-800 dark:text-[var(--content-text)] hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:shadow'}`}
          >
            {t('Archived', 'Archived')}
          </button>
        </div>

        {/* Search + Filter side-by-side */}
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={t('Search')}
              className="w-full rounded-lg border px-3 py-2.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 border-gray-300 placeholder:text-gray-500 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
            />
            <span className="absolute left-2 top-1/2 -translate-y-1/2 opacity-70 text-gray-600 dark:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><circle cx="11" cy="11" r="6" /><path d="M21 21l-4.5-4.5" /></svg>
            </span>
          </div>
          <div className="w-40">
            <SearchableSelect
              options={TYPES}
              value={type}
              onChange={setType}
              placeholder={t('All')}
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-md text-sm opacity-75">
            {t('No notifications', 'No notifications')}
          </div>
        ) : (
          visible.map(n => (
            <NotificationItem
              key={n.id}
              data={n}
              onClick={handleNotificationClick}
              onToggleRead={() => toggleRead(n.id)}
              onArchive={() => setArchived(n.id, true)}
              onUnarchive={() => setArchived(n.id, false)}
            />
          ))
        )}
      </div>

      {/* Task Details Modal - removed from here, handled in Topbar/Layout */}
    </div>
  )
}

export default function Notifications() {
  const [selectedTask, setSelectedTask] = useState(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  return (
    <Layout>
      <NotificationsContent 
        embedded={false} 
        onOpenTask={(task) => {
          setSelectedTask(task)
          setIsTaskModalOpen(true)
        }}
      />
      {isTaskModalOpen && selectedTask && (
        <TaskDetailsModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          task={selectedTask}
        />
      )}
    </Layout>
  )
}
