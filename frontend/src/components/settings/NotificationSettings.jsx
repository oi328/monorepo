import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { Monitor, Moon, Bell, Save } from 'lucide-react';
import Toggle from '../../shared/components/Toggle';

const MODULE_DEFINITION = [
  {
    key: 'leads',
    labelKey: 'Leads & Actions',
    notifications: [
      { key: 'notify_assigned_leads', labelKey: 'Assigned Leads' },
      { key: 'notify_delay_leads', labelKey: 'Delay Leads' },
      { key: 'notify_requests', labelKey: 'Requests' },
      { key: 'add_action', labelKey: 'Add Action' }
    ]
  },
  {
    key: 'customers',
    labelKey: 'Customers & Invoices',
    notifications: [
      { key: 'notify_add_customer', labelKey: 'Add Customer' },
      { key: 'notify_create_invoice', labelKey: 'Create Invoice' },
      { key: 'notify_rent_end_date', labelKey: 'Rent End Date' }
    ]
  },
  {
    key: 'support',
    labelKey: 'Support',
    notifications: [
      { key: 'notify_open_ticket', labelKey: 'Open Ticket' }
    ]
  },
  {
    key: 'marketing',
    labelKey: 'Marketing Campaigns',
    notifications: [
      { key: 'notify_campaign_expired', labelKey: 'Campaign Expired' }
    ]
  },
  {
    key: 'tasks',
    labelKey: 'Tasks',
    notifications: [
      { key: 'notify_task_assigned', labelKey: 'Task Assigned' },
      { key: 'notify_task_expired', labelKey: 'Task Expired' }
    ]
  }
];

const DEFAULT_CHANNELS = {
  email: true,
  app: true,
  sms: false
};

const DEFAULT_RECIPIENTS = {
  owner: false,
  assignee: true,
  manager: false,
  assigner: false,
  previous_owner: false,
  team_leader: false,
  director: false,
  operations_manager: false,
  sales_admin: false,
  sales_manager: false,
  branch_manager: false,
   marketing_manager: false,
   marketing_moderator: false,
  custom_user_ids: []
};

const getTeamLeaderLabel = (t, moduleKey) => {
  switch (moduleKey) {
    case 'customers':
      return t('Customer Team Leader');
    case 'support':
      return t('Support Team Leader');
    default:
      return t('Team Leader');
  }
};

const NotificationSettings = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [settings, setSettings] = useState({
    system_notifications: true,
    app_notifications: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '',
    quiet_hours_end: '',
    notify_assigned_leads: true,
    notify_delay_leads: true,
    notify_requests: true,
    notify_rent_end_date: true,
    notify_add_customer: true,
    notify_create_invoice: true,
    notify_open_ticket: true,
    notify_campaign_expired: true,
    notify_task_assigned: true,
    notify_task_expired: true,
    meta_data: {}
  });
  const [activeModule, setActiveModule] = useState('leads');
  const [users, setUsers] = useState([]);
  const [recipientsModal, setRecipientsModal] = useState({
    open: false,
    moduleKey: null,
    notifKey: null
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('notificationsSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.soundEnabled === 'boolean') {
          setSoundEnabled(parsed.soundEnabled);
        }
      }
    } catch {}
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/api/notification-settings');
      setSettings(prev => {
        const incoming = { ...prev, ...data };
        if (!incoming.meta_data || typeof incoming.meta_data !== 'object') {
          incoming.meta_data = {};
        }
        return incoming;
      });
    } catch (error) {
      console.error('Failed to fetch notification settings', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users');
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setUsers(list);
    } catch (e) {
      console.error('Failed to fetch users for notification recipients', e);
    }
  };

  const handleToggle = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getModuleMeta = moduleKey => {
    const meta = settings.meta_data || {};
    const modules = Array.isArray(meta.modules) ? meta.modules : [];
    const found = modules.find(m => m.key === moduleKey);
    if (found) {
      return found;
    }
    return {
      key: moduleKey,
      notifications: []
    };
  };

  const getNotificationMeta = (moduleKey, notifKey) => {
    const moduleMeta = getModuleMeta(moduleKey);
    const notifications = Array.isArray(moduleMeta.notifications) ? moduleMeta.notifications : [];
    const found = notifications.find(n => n.key === notifKey);
    const baseRecipients =
      notifKey === 'notify_assigned_leads'
        ? {
            ...DEFAULT_RECIPIENTS,
            manager: true,
            assigner: true
          }
        : notifKey === 'notify_task_assigned'
          ? {
              ...DEFAULT_RECIPIENTS,
              owner: true
            }
        : DEFAULT_RECIPIENTS;
    if (found) {
      return {
        enabled: typeof found.enabled === 'boolean' ? found.enabled : true,
        channels: { ...DEFAULT_CHANNELS, ...(found.channels || {}) },
        recipients: { ...baseRecipients, ...(found.recipients || {}) }
      };
    }
    return {
      enabled: true,
      channels: { ...DEFAULT_CHANNELS },
      recipients: { ...baseRecipients }
    };
  };

  const updateNotificationMeta = (moduleKey, notifKey, updater) => {
    setSettings(prev => {
      const meta = prev.meta_data || {};
      const modules = Array.isArray(meta.modules) ? [...meta.modules] : [];
      let moduleIndex = modules.findIndex(m => m.key === moduleKey);
      if (moduleIndex === -1) {
        modules.push({ key: moduleKey, notifications: [] });
        moduleIndex = modules.length - 1;
      }
      const moduleMeta = modules[moduleIndex];
      const notifs = Array.isArray(moduleMeta.notifications) ? [...moduleMeta.notifications] : [];
      let notifIndex = notifs.findIndex(n => n.key === notifKey);
      if (notifIndex === -1) {
        notifs.push({ key: notifKey });
        notifIndex = notifs.length - 1;
      }
      const current = notifs[notifIndex];
      const next = updater(current || {});
      notifs[notifIndex] = { key: notifKey, ...next };
      modules[moduleIndex] = { ...moduleMeta, notifications: notifs };
      return {
        ...prev,
        meta_data: {
          ...meta,
          modules
        }
      };
    });
  };

  const handleChannelChange = (moduleKey, notifKey, channelKey, checked) => {
    updateNotificationMeta(moduleKey, notifKey, current => {
      const channels = { ...DEFAULT_CHANNELS, ...(current.channels || {}) };
      channels[channelKey] = checked;
      return { ...current, channels };
    });
  };

  const openRecipientsModal = (moduleKey, notifKey) => {
    setRecipientsModal({
      open: true,
      moduleKey,
      notifKey
    });
  };

  const closeRecipientsModal = () => {
    setRecipientsModal({
      open: false,
      moduleKey: null,
      notifKey: null
    });
  };

  const handleRecipientToggle = (moduleKey, notifKey, field, checked) => {
    updateNotificationMeta(moduleKey, notifKey, current => {
      const baseRecipients =
        notifKey === 'notify_assigned_leads'
          ? {
              ...DEFAULT_RECIPIENTS,
              manager: true,
              assigner: true
            }
          : notifKey === 'notify_task_assigned'
            ? {
                ...DEFAULT_RECIPIENTS,
                owner: true
              }
          : DEFAULT_RECIPIENTS;
      const recipients = { ...baseRecipients, ...(current.recipients || {}) };
      recipients[field] = checked;
      return { ...current, recipients };
    });
  };

  const handleCustomUsersChange = (moduleKey, notifKey, ids) => {
    updateNotificationMeta(moduleKey, notifKey, current => {
      const baseRecipients =
        notifKey === 'notify_assigned_leads'
          ? {
              ...DEFAULT_RECIPIENTS,
              manager: true,
              assigner: true
            }
          : DEFAULT_RECIPIENTS;
      const recipients = { ...baseRecipients, ...(current.recipients || {}) };
      recipients.custom_user_ids = ids;
      return { ...current, recipients };
    });
  };

  const quietHoursAdvanced = useMemo(() => {
    const meta = settings.meta_data || {};
    const qh = meta.quiet_hours || {};
    return {
      allowed_channels: {
        email: qh.allowed_channels?.email ?? true,
        app: qh.allowed_channels?.app ?? false,
        sms: qh.allowed_channels?.sms ?? false
      },
      days: Array.isArray(qh.days) && qh.days.length ? qh.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    };
  }, [settings.meta_data]);

  const toggleQuietChannel = (channelKey, checked) => {
    setSettings(prev => {
      const meta = prev.meta_data || {};
      const qh = meta.quiet_hours || {};
      const allowed = {
        email: qh.allowed_channels?.email ?? true,
        app: qh.allowed_channels?.app ?? false,
        sms: qh.allowed_channels?.sms ?? false
      };
      allowed[channelKey] = checked;
      return {
        ...prev,
        meta_data: {
          ...meta,
          quiet_hours: {
            ...qh,
            allowed_channels: allowed,
            days: Array.isArray(qh.days) && qh.days.length ? qh.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          }
        }
      };
    });
  };

  const toggleQuietDay = day => {
    setSettings(prev => {
      const meta = prev.meta_data || {};
      const qh = meta.quiet_hours || {};
      const days = Array.isArray(qh.days) && qh.days.length ? [...qh.days] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const exists = days.includes(day);
      const nextDays = exists ? days.filter(d => d !== day) : [...days, day];
      return {
        ...prev,
        meta_data: {
          ...meta,
          quiet_hours: {
            ...qh,
            allowed_channels: {
              email: qh.allowed_channels?.email ?? true,
              app: qh.allowed_channels?.app ?? false,
              sms: qh.allowed_channels?.sms ?? false
            },
            days: nextDays
          }
        }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...settings,
        meta_data: settings.meta_data
      };
      const { data } = await api.put('/api/notification-settings', payload);
      setSettings(prev => {
        const incoming = { ...prev, ...data };
        if (!incoming.meta_data || typeof incoming.meta_data !== 'object') {
          incoming.meta_data = {};
        }
        return incoming;
      });
      toast.success(t('Settings saved successfully'));
    } catch (error) {
      console.error('Failed to update notification settings', error);
      toast.error(t('Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('Loading...')}</div>;
  }

  const activeModuleDef = MODULE_DEFINITION.find(m => m.key === activeModule) || MODULE_DEFINITION[0];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <h3 className="font-medium text-theme-text flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-theme-text" />
            {t('General Channels')}
          </h3>
          <Toggle
            label={t('System Notifications')}
            value={settings.system_notifications}
            onChange={val => handleToggle('system_notifications', val)}
          />
          <Toggle
            label={t('App Notifications')}
            value={settings.app_notifications}
            onChange={val => handleToggle('app_notifications', val)}
          />
        </div>

        <div className="card p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <h3 className="font-medium text-theme-text flex items-center gap-2 mb-4">
            <Moon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            {t('Quiet Hours')}
          </h3>
          <Toggle
            label={t('Enable Quiet Hours')}
            value={settings.quiet_hours_enabled}
            onChange={val => handleToggle('quiet_hours_enabled', val)}
          />

          {settings.quiet_hours_enabled && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-theme-text mb-1">
                    {t('Start Time')}
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text" />
                    <input
                      type="time"
                      value={settings.quiet_hours_start || ''}
                      onChange={e => handleChange('quiet_hours_start', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-theme text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-theme-text mb-1">
                    {t('End Time')}
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text" />
                    <input
                      type="time"
                      value={settings.quiet_hours_end || ''}
                      onChange={e => handleChange('quiet_hours_end', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-theme text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-theme-text">
                  {t('Allowed Channels During Quiet Hours')}
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={quietHoursAdvanced.allowed_channels.email}
                      onChange={e => toggleQuietChannel('email', e.target.checked)}
                    />
                    <span>{t('Email')}</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={quietHoursAdvanced.allowed_channels.app}
                      onChange={e => toggleQuietChannel('app', e.target.checked)}
                    />
                    <span>{t('In-App')}</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={quietHoursAdvanced.allowed_channels.sms}
                      onChange={e => toggleQuietChannel('sms', e.target.checked)}
                    />
                    <span>{t('SMS')}</span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-theme-text">
                  {t('Quiet Hours Days')}
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleQuietDay(day)}
                      className={[
                        'px-2 py-1 rounded-full border text-xs',
                        quietHoursAdvanced.days.includes(day)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-transparent text-theme-text border-gray-300 dark:border-gray-700'
                      ].join(' ')}
                    >
                      {t(day)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <h3 className="font-medium text-theme-text mb-4">
            {t('Preferences')}
          </h3>
          <Toggle
            label={t('Notification Sound')}
            value={soundEnabled}
            onChange={val => {
              setSoundEnabled(val);
              try {
                const raw = localStorage.getItem('notificationsSettings');
                let parsed = {};
                if (raw) {
                  parsed = JSON.parse(raw) || {};
                }
                parsed.soundEnabled = val;
                localStorage.setItem('notificationsSettings', JSON.stringify(parsed));
              } catch {}
            }}
          />
        </div>

        <div className="md:col-span-2 card p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-theme-text" />
              <h3 className="font-medium text-theme-text">
                {t('Notification Types')}
              </h3>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {MODULE_DEFINITION.map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => setActiveModule(m.key)}
                className={[
                  'px-3 py-1.5 rounded-full text-xs whitespace-nowrap border',
                  activeModule === m.key
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-transparent text-theme-text border-gray-300 dark:border-gray-700'
                ].join(' ')}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>

          <div className="space-y-3 mt-4 flex flex-wrap gap-4">
            {activeModuleDef.notifications.map(notif => {
              const notifMeta = getNotificationMeta(activeModuleDef.key, notif.key);
              const isLegacyToggle = notif.key.startsWith('notify_');
              const enabled = isLegacyToggle ? settings[notif.key] ?? true : notifMeta.enabled ?? true;
              const recipientsSummaryParts = [];
              if (notifMeta.recipients.owner) {
                recipientsSummaryParts.push(t('Owner'));
              }
              if (notifMeta.recipients.assignee) {
                recipientsSummaryParts.push(t('Assigned User'));
              }
              if (notifMeta.recipients.manager) {
                recipientsSummaryParts.push(t("Assignee's Manager"));
              }
              if (notifMeta.recipients.assigner) {
                recipientsSummaryParts.push(t('Assigner'));
              }
              if (notifMeta.recipients.previous_owner) {
                recipientsSummaryParts.push(t('Previous Owner'));
              }
              if (notifMeta.recipients.team_leader && activeModuleDef.key !== 'marketing') {
                recipientsSummaryParts.push(getTeamLeaderLabel(t, activeModuleDef.key));
              }
              if (notifMeta.recipients.director) {
                recipientsSummaryParts.push(t('Director'));
              }
              if (notifMeta.recipients.operations_manager) {
                recipientsSummaryParts.push(t('Operations Manager'));
              }
              if (notifMeta.recipients.sales_admin) {
                recipientsSummaryParts.push(t('Sales Admin'));
              }
              if (notifMeta.recipients.sales_manager) {
                recipientsSummaryParts.push(t('Sales Manager'));
              }
              if (notifMeta.recipients.branch_manager) {
                recipientsSummaryParts.push(t('Branch Manager'));
              }
              if (notifMeta.recipients.marketing_manager) {
                recipientsSummaryParts.push(t('Marketing Manager'));
              }
              if (notifMeta.recipients.marketing_moderator) {
                recipientsSummaryParts.push(t('Marketing Moderator'));
              }
              if (notifMeta.recipients.custom_user_ids.length > 0) {
                recipientsSummaryParts.push(
                  t('Custom Users') + ' (' + notifMeta.recipients.custom_user_ids.length + ')'
                );
              }
              const recipientsSummary = recipientsSummaryParts.length
                ? recipientsSummaryParts.join(' • ')
                : t('No recipients selected');
              const channelsSummaryParts = [];
              if (notifMeta.channels.email) channelsSummaryParts.push(t('Email'));
              if (notifMeta.channels.app) channelsSummaryParts.push(t('In-App'));
              if (notifMeta.channels.sms) channelsSummaryParts.push(t('SMS'));
              const channelsSummary = channelsSummaryParts.length
                ? channelsSummaryParts.join(' • ')
                : t('No channels enabled');

              return (
                <div
                  key={notif.key}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Toggle
                        label={t(notif.labelKey)}
                        value={enabled}
                        onChange={val => {
                          if (isLegacyToggle) {
                            handleToggle(notif.key, val);
                          } else {
                            updateNotificationMeta(activeModuleDef.key, notif.key, current => ({
                              ...current,
                              enabled: val
                            }));
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={notifMeta.channels.email}
                          onChange={e =>
                            handleChannelChange(activeModuleDef.key, notif.key, 'email', e.target.checked)
                          }
                        />
                        <span>{t('Email')}</span>
                      </label>
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={notifMeta.channels.app}
                          onChange={e =>
                            handleChannelChange(activeModuleDef.key, notif.key, 'app', e.target.checked)
                          }
                        />
                        <span>{t('In-App')}</span>
                      </label>
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={notifMeta.channels.sms}
                          onChange={e =>
                            handleChannelChange(activeModuleDef.key, notif.key, 'sms', e.target.checked)
                          }
                        />
                        <span>{t('SMS')}</span>
                      </label>
                    </div>
                    <div className="text-xs text-[var(--muted-text)]">
                      {t('Preview')}: {channelsSummary} {t('to')} {recipientsSummary}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => openRecipientsModal(activeModuleDef.key, notif.key)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs text-theme-text hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      {t('Select Recipients')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? t('Saving...') : t('Save Changes')}
        </button>
      </div>

      {recipientsModal.open && (
        <RecipientsModal
          t={t}
          users={users}
          moduleKey={recipientsModal.moduleKey}
          notifKey={recipientsModal.notifKey}
          meta={getNotificationMeta(recipientsModal.moduleKey, recipientsModal.notifKey)}
          onClose={closeRecipientsModal}
          onToggleRecipient={handleRecipientToggle}
          onCustomUsersChange={handleCustomUsersChange}
        />
      )}
    </div>
  );
};

const RecipientsModal = ({
  t,
  users,
  moduleKey,
  notifKey,
  meta,
  onClose,
  onToggleRecipient,
  onCustomUsersChange
}) => {
  const selectedIds = meta.recipients.custom_user_ids || [];

  const handleUserToggle = id => {
    const exists = selectedIds.includes(id);
    const next = exists ? selectedIds.filter(x => x !== id) : [...selectedIds, id];
    onCustomUsersChange(moduleKey, notifKey, next);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="font-semibold text-theme-text">
            {t('Select Recipients')}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-theme-text px-2 py-1 rounded-lg hover:bg-gray-800/40"
          >
            {t('Close')}
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium text-theme-text">
                {t('Default Recipients')}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.owner}
                    onChange={e => onToggleRecipient(moduleKey, notifKey, 'owner', e.target.checked)}
                  />
                  <span>{t('Owner')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.assignee}
                    onChange={e => onToggleRecipient(moduleKey, notifKey, 'assignee', e.target.checked)}
                  />
                  <span>{t('Assigned User')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.manager}
                    onChange={e => onToggleRecipient(moduleKey, notifKey, 'manager', e.target.checked)}
                  />
                  <span>{t("Assignee's Manager")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.assigner}
                    onChange={e => onToggleRecipient(moduleKey, notifKey, 'assigner', e.target.checked)}
                  />
                  <span>{t('Assigner')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.previous_owner}
                    onChange={e =>
                      onToggleRecipient(moduleKey, notifKey, 'previous_owner', e.target.checked)
                    }
                  />
                  <span>{t('Previous Owner')}</span>
                </label>
                {moduleKey !== 'marketing' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={meta.recipients.team_leader}
                      onChange={e =>
                        onToggleRecipient(moduleKey, notifKey, 'team_leader', e.target.checked)
                      }
                    />
                    <span>{getTeamLeaderLabel(t, moduleKey)}</span>
                  </label>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.director}
                    onChange={e => onToggleRecipient(moduleKey, notifKey, 'director', e.target.checked)}
                  />
                  <span>{t('Director')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.operations_manager}
                    onChange={e =>
                      onToggleRecipient(moduleKey, notifKey, 'operations_manager', e.target.checked)
                    }
                  />
                  <span>{t('Operations Manager')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.sales_admin}
                    onChange={e => onToggleRecipient(moduleKey, notifKey, 'sales_admin', e.target.checked)}
                  />
                  <span>{t('Sales Admin')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.sales_manager}
                    onChange={e => onToggleRecipient(moduleKey, notifKey, 'sales_manager', e.target.checked)}
                  />
                  <span>{t('Sales Manager')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.branch_manager}
                    onChange={e =>
                      onToggleRecipient(moduleKey, notifKey, 'branch_manager', e.target.checked)
                    }
                  />
                  <span>{t('Branch Manager')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.marketing_manager}
                    onChange={e =>
                      onToggleRecipient(moduleKey, notifKey, 'marketing_manager', e.target.checked)
                    }
                  />
                  <span>{t('Marketing Manager')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={meta.recipients.marketing_moderator}
                    onChange={e =>
                      onToggleRecipient(
                        moduleKey,
                        notifKey,
                        'marketing_moderator',
                        e.target.checked
                      )
                    }
                  />
                  <span>{t('Marketing Moderator')}</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-theme-text">
                {t('Custom Users')}
              </div>
              <div className="text-xs text-[var(--muted-text)]">
                {t('Select additional users who should receive this notification.')}
              </div>
            </div>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl max-h-64 overflow-y-auto">
            {users.length === 0 && (
              <div className="p-4 text-xs text-[var(--muted-text)]">
                {t('No users available')}
              </div>
            )}
            {users.map(u => (
              <label
                key={u.id}
                className="flex items-center justify-between px-4 py-2 text-sm border-b border-gray-100 dark:border-gray-800 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="text-theme-text">{u.name}</span>
                  <span className="text-xs text-[var(--muted-text)]">{u.email}</span>
                </div>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(u.id)}
                  onChange={() => handleUserToggle(u.id)}
                />
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs text-theme-text hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {t('Done')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
