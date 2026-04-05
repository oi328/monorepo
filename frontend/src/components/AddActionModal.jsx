import { forwardRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaPhone, FaEnvelope, FaCalendarAlt, FaClock, FaComments, FaHandshake, FaFileAlt, FaTimes, FaChevronDown, FaToggleOn, FaToggleOff, FaTrash, FaPlus } from 'react-icons/fa';
import { useTheme } from '../shared/context/ThemeProvider.jsx';
import { useAppState } from '../shared/context/AppStateProvider.jsx';
import { api } from '../utils/api';
import { setLastActionStageId } from '../utils/lastActionStage';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { flip, offset, shift, size } from '@floating-ui/react';
import './AddActionModalDatepicker.css';
import SearchableSelect from './SearchableSelect.jsx';

const AddActionModal = ({ isOpen, onClose, onSave, lead, inline = false, initialType = 'call', initialDate, isOwnerProp, isSuperAdminProp: _isSuperAdminProp }) => {
  const { i18n } = useTranslation();
  const { theme: _theme, resolvedTheme } = useTheme();
  const { user, company } = useAppState();
  const isLight = resolvedTheme === 'light';
  const _lintKeep = { createPortal, DatePicker, SearchableSelect, FaClock, FaHandshake, FaTimes, FaChevronDown, FaToggleOn, FaToggleOff, FaTrash, FaPlus };

  const isRTL = i18n.dir() === 'rtl';
  const isArabic = isRTL;

  const [stages, setStages] = useState([]);
  const [units, setUnits] = useState([]);
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const response = await api.get('/api/stages');
        setStages(response.data);
      } catch (error) {
        console.error('Failed to fetch stages:', error);
      }
    };
    fetchStages();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propertiesRes, projectsRes, categoriesRes, itemsRes] = await Promise.all([
          // Only fetch selectable units for reservation/rent dropdowns (hide sold & active reserved)
          api.get('/api/properties?all=1&selectable=1&fields=dropdown'),
          api.get('/api/projects'),
          api.get('/api/item-categories'),
          api.get('/api/items')
        ]);

        const rawProjects = Array.isArray(projectsRes.data)
          ? projectsRes.data
          : (projectsRes.data.data || []);

        const rawProperties = Array.isArray(propertiesRes.data)
          ? propertiesRes.data
          : (propertiesRes.data.data || []);

        const mappedUnits = rawProperties.map(p => {
          const projectMatch = rawProjects.find(pr =>
            pr.id === p.project_id ||
            pr.name === p.project ||
            pr.name_ar === p.project ||
            pr.title === p.project
          );

          return {
            id: p.id,
            name: p.unit_code || p.name || p.title || `#${p.id}`,
            project_id: projectMatch ? projectMatch.id : (p.project_id ?? undefined),
            rent_amount: p.rent_cost ?? p.rent_amount ?? p.total_price ?? 0
          };
        });

        setUnits(mappedUnits);
        setProjects(rawProjects);
        setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : (categoriesRes.data.data || []));
        setItems(Array.isArray(itemsRes.data) ? itemsRes.data : (itemsRes.data.data || []));
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  const buildInitialActionData = () => ({
    type: initialType,
    actionType: initialType,
    nextAction: 'follow_up',
    stage_id: '',
    title: '',
    description: '',
    date: initialDate || new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    status: 'pending',
    priority: lead?.priority || 'medium',
    assignedTo: '',
    notes: '',
    meetingType: 'introduction',
    meetingLocation: 'indoor',
    meeting_status: '',
    answerStatus: 'answer',
    selectedQuickOption: null,
    proposalAmount: '',
    proposalDiscount: '',
    proposalValidityDays: '',
    proposalAttachmentUrl: '',
    proposalAttachment: null,
    reservationType: 'project',
    reservationCategory: '',
    reservationItem: '',
    reservationGeneralItems: [{ category: '', item: '', quantity: 1, price: 0 }],
    reservationNotes: '',
    reservationProject: '',
    reservationUnit: '',
    reservationAmount: '',
    rentUnit: '',
    rentStart: '',
    rentEnd: '',
    rentAmount: '',
    rentAttachment: null,
    closingRevenue: '',
    cancelReason: '',
    doneMeeting: false
  });

  const [actionData, setActionData] = useState(buildInitialActionData);

  useEffect(() => {
    if (!isOpen) return;
    setActionData(buildInitialActionData());
  }, [isOpen, lead?.id, initialType, initialDate]);

  const pad2 = (n) => String(n).padStart(2, '0');
  const toLocalDateStr = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const toLocalTimeStr = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const parseHHmm = (value) => {
    if (typeof value !== 'string') return null;
    const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const hours = Number(m[1]);
    const minutes = Number(m[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23) return null;
    if (minutes < 0 || minutes > 59) return null;
    return { hours, minutes };
  };

  const toHHmm = (hours, minutes) => `${pad2(hours)}:${pad2(minutes)}`;

  const ScheduleTimeInput = ({ date, value, onChange }) => {
    const parsed = parseHHmm(value);
    const fallback = (date instanceof Date && !Number.isNaN(date.getTime())) ? date : new Date();
    const hours = parsed ? parsed.hours : fallback.getHours();
    const minutes = parsed ? parsed.minutes : fallback.getMinutes();
    const hhmm = toHHmm(hours, minutes);
    const meridiem = hours >= 12 ? 'PM' : 'AM';

    const btnBase = `px-2 py-1 rounded-md text-xs border transition-colors ${isLight ? 'bg-white border-gray-300 text-slate-700 hover:bg-gray-50' : 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700'}`;
    const btnActive = 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700';

    const commit = (h, m) => onChange(toHHmm(clamp(h, 0, 23), clamp(m, 0, 59)));

    const stepHours = (delta) => {
      const d = (date instanceof Date && !Number.isNaN(date.getTime())) ? new Date(date) : new Date();
      d.setHours(hours + delta);
      commit(d.getHours(), minutes);
    };

    const setMer = (mer) => {
      const base = hours % 12;
      const nextHours = (mer === 'PM') ? base + 12 : base;
      commit(nextHours, minutes);
    };

    return (
      <div className={`add-action-time-input-compact ${isRTL ? 'rtl' : ''}`}>
        <div className="add-action-time-input-compact__row">
          <input
            type="time"
            step={60}
            value={hhmm}
            onChange={(e) => onChange(e.target.value)}
            className={`add-action-time-input-compact__time w-full px-2 py-1.5 rounded-md text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLight ? 'bg-white border-gray-300 text-slate-900' : 'bg-gray-800 border-gray-600 text-white'}`}
            aria-label={isArabic ? 'الوقت' : 'Time'}
          />
          <button type="button" onClick={() => stepHours(-1)} className={btnBase} aria-label="Minus 1 hour">-1h</button>
          <button type="button" onClick={() => stepHours(1)} className={btnBase} aria-label="Plus 1 hour">+1h</button>
          <button type="button" onClick={() => setMer('AM')} className={`${btnBase} ${meridiem === 'AM' ? btnActive : ''}`}>AM</button>
          <button type="button" onClick={() => setMer('PM')} className={`${btnBase} ${meridiem === 'PM' ? btnActive : ''}`}>PM</button>
        </div>
      </div>
    );
  };

  const getScheduleDate = () => {
    try {
      const raw = new Date(`${actionData.date}T${actionData.time}`);
      return Number.isNaN(raw.getTime()) ? null : raw;
    } catch {
      return null;
    }
  };

  const getScheduleDay = () => {
    try {
      if (!actionData.date) return null;
      const raw = new Date(`${actionData.date}T00:00:00`);
      return Number.isNaN(raw.getTime()) ? null : raw;
    } catch {
      return null;
    }
  };

  const setScheduleDateOnly = (d) => {
    if (!d) return;
    setActionData(prev => ({
      ...prev,
      date: toLocalDateStr(d),
      time: prev.time || toLocalTimeStr(new Date()),
      selectedQuickOption: null
    }));
  };

  const getScheduleTimeParts = () => {
    const parsed = parseHHmm(actionData.time);
    const fallback = new Date();
    const hours24 = parsed ? parsed.hours : fallback.getHours();
    const minutes = parsed ? parsed.minutes : fallback.getMinutes();
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const hour12 = (hours24 % 12) === 0 ? 12 : (hours24 % 12);
    return { hours24, minutes, period, hour12 };
  };

  const formatScheduleTime = ({ hour12, minutes, period }) => {
    const ampm = isArabic ? (period === 'AM' ? 'ص' : 'م') : period;
    return `${pad2(hour12)}:${pad2(minutes)} ${ampm}`;
  };

  const formatScheduleDate = (d) => {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '';
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    return isArabic ? `${dd}/${mm}/${yyyy}` : `${mm}/${dd}/${yyyy}`;
  };

  const handleScheduleClickOutside = (event) => {
    // The time dropdowns inside the calendar are rendered in a portal (document.body),
    // which would otherwise be treated as an "outside click" and close the datepicker.
    const target = event?.target;
    if (target instanceof Element && target.closest('[data-searchable-select-dropdown="true"]')) return;
    setSchedulePickerOpen(false);
  };

  const ScheduleDateTimeInput = forwardRef(function ScheduleDateTimeInput(_props, ref) {
    const day = getScheduleDay();
    const displayDate = day ? formatScheduleDate(day) : '';
    const displayTime = actionData.time ? formatScheduleTime(getScheduleTimeParts()) : '';
    const displayValue = [displayDate, displayTime].filter(Boolean).join('  ');

    const baseClasses = isLight
      ? 'w-full px-4 py-3 bg-white border border-gray-300 text-slate-900'
      : 'w-full px-4 py-3 bg-gray-800 border border-gray-600 text-white';

    return (
      <div className="relative" onClick={() => setSchedulePickerOpen(true)}>
        <FaCalendarAlt className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
        <FaClock className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
        <input
          ref={ref}
          type="text"
          readOnly
          value={displayValue}
          onFocus={() => setSchedulePickerOpen(true)}
          className={`${baseClasses} ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer`}
          placeholder={isArabic ? 'اختر التاريخ والوقت' : 'Select date & time'}
          dir={isRTL ? 'rtl' : 'ltr'}
        />
      </div>
    );
  });

  const setScheduleTimeParts = ({ hour12, minutes, period }) => {
    const safeHour12 = clamp(Number(hour12), 1, 12);
    const safeMinutes = clamp(Number(minutes), 0, 59);
    const base = safeHour12 % 12;
    const hours24 = (period === 'PM') ? base + 12 : base;
    const nextTime = toHHmm(hours24, safeMinutes);
    setActionData(prev => ({
      ...prev,
      time: nextTime,
      selectedQuickOption: null
    }));
  };

  const setScheduleFromDate = (d) => {
    setActionData(prev => ({
      ...prev,
      date: toLocalDateStr(d),
      time: toLocalTimeStr(d),
      selectedQuickOption: null
    }));
  };

  const clearSchedule = () => {
    setActionData(prev => ({
      ...prev,
      date: '',
      time: '',
      selectedQuickOption: null
    }));
  };

  const SchedulePopperContainer = ({ children }) =>
    createPortal(<div className="relative z-[10050]">{children}</div>, document.body);

  const ScheduleCalendarContainer = ({ className, children }) => (
    <div className={className}>
      {children}
      <div className={`add-action-datepicker-time-controls w-full border-t ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'} px-3 py-3`}>
        <div className={`text-sm font-semibold mb-2 ${isLight ? 'text-slate-900' : 'text-gray-100'} ${isRTL ? 'text-right' : 'text-left'}`}>
          {isArabic ? 'اختيار الوقت' : 'Choose time'}
        </div>
        {(() => {
          const { hour12, minutes, period } = getScheduleTimeParts();
          const hourOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: pad2(i + 1) }));
          const minuteOptions = Array.from({ length: 60 }, (_, i) => ({ value: String(i), label: pad2(i) }));
          const periodOptions = [
            { value: 'AM', label: isArabic ? 'ص' : 'AM' },
            { value: 'PM', label: isArabic ? 'م' : 'PM' },
          ];
          const selectClass = `${isLight ? 'bg-white border border-gray-300 text-slate-900' : 'bg-gray-800 border border-gray-600 text-white'} rounded-lg h-10 px-3`;

          const hourSelect = (
            <SearchableSelect
              options={hourOptions}
              value={String(hour12)}
              onChange={(v) => setScheduleTimeParts({ hour12: v, minutes, period })}
              placeholder={isArabic ? 'ساعة' : 'Hour'}
              isRTL={isRTL}
              className={selectClass}
              showAllOption={false}
              isClearable={false}
              dropdownZIndex={10080}
            />
          );

          const minuteSelect = (
            <SearchableSelect
              options={minuteOptions}
              value={String(minutes)}
              onChange={(v) => setScheduleTimeParts({ hour12, minutes: v, period })}
              placeholder={isArabic ? 'دقيقة' : 'Minute'}
              isRTL={isRTL}
              className={selectClass}
              showAllOption={false}
              isClearable={false}
              dropdownZIndex={10080}
            />
          );

          const periodSelect = (
            <SearchableSelect
              options={periodOptions}
              value={period}
              onChange={(v) => setScheduleTimeParts({ hour12, minutes, period: v })}
              placeholder={isArabic ? 'ص/م' : 'AM/PM'}
              isRTL={isRTL}
              className={selectClass}
              showAllOption={false}
              isClearable={false}
              dropdownZIndex={10080}
            />
          );

          return (
            <div className="grid grid-cols-3 gap-2 items-center">
              {isRTL ? (
                <>
                  {hourSelect}
                  {minuteSelect}
                  {periodSelect}
                </>
              ) : (
                <>
                  {hourSelect}
                  {minuteSelect}
                  {periodSelect}
                </>
              )}
            </div>
          );
        })()}
      </div>
      <div
        className={`add-action-datepicker-footer clear-both w-full border-t ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'} px-3 py-2 flex flex-wrap items-center justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <button
          type="button"
          onClick={clearSchedule}
          className="add-action-datepicker-btn add-action-datepicker-btn--link"
        >
          {isArabic ? 'مسح' : 'Clear'}
        </button>
        <button
          type="button"
          onClick={() => setScheduleFromDate(new Date())}
          className="add-action-datepicker-btn add-action-datepicker-btn--secondary"
        >
          {isArabic ? 'اليوم' : 'Today'}
        </button>
        <button
          type="button"
          onClick={() => setSchedulePickerOpen(false)}
          className="add-action-datepicker-btn add-action-datepicker-btn--primary"
        >
          {isArabic ? 'تأكيد' : 'Confirm'}
        </button>
      </div>
    </div>
  );

  const applyStageSelection = (stageId) => {
    const stage = (Array.isArray(stages) ? stages : []).find(s => String(s.id) === String(stageId));
    if (!stage) return false;

    const stageType = stage.type;
    const newActionType = (['proposal', 'reservation', 'closing_deals', 'rent', 'meeting'].includes(stageType)) ? stageType : 'call';

    setActionData(prev => ({
      ...prev,
      stage_id: String(stageId),
      nextAction: stageType,
      actionType: newActionType,
      type: newActionType
    }));

    return true;
  };

  const getStageIdFromStageName = (stageName) => {
    if (!stageName || !Array.isArray(stages) || stages.length === 0) return null;
    const normalized = String(stageName).trim().toLowerCase();
    if (!normalized) return null;

    const matched = stages.find((s) => {
      const names = [s.name, s.name_en, s.title, s.display_name, s.key].filter(Boolean);
      return names.some((n) => String(n).trim().toLowerCase() === normalized);
    });

    return matched ? String(matched.id) : null;
  };

  const getLeadLastActionStageId = () => {
    const hasAnyActions = (() => {
      const countCandidates = [
        lead?.actions_count,
        lead?.actionsCount,
        lead?.lead_actions_count,
        lead?.leadActionsCount,
      ].filter((v) => v !== null && v !== undefined);
      if (countCandidates.some((v) => Number(v) > 0)) return true;

      const arrays = [lead?.actions, lead?.lead_actions, lead?.leadActions];
      if (arrays.some((a) => Array.isArray(a) && a.length > 0)) return true;

      if (lead?.latestAction || lead?.latest_action || lead?.lastAction || lead?.last_action) return true;
      return false;
    })();

    const directCandidates = [
      lead?.latestAction?.stage_id,
      lead?.latestAction?.stageId,
      lead?.latest_action?.stage_id,
      lead?.latest_action?.stageId,
      lead?.lastAction?.stage_id,
      lead?.lastAction?.stageId,
      lead?.last_action?.stage_id,
      lead?.last_action?.stageId,
    ];

    for (const candidate of directCandidates) {
      if (candidate !== null && candidate !== undefined && String(candidate).trim() !== '') {
        return String(candidate);
      }
    }

    const actions = lead?.actions || lead?.lead_actions || lead?.leadActions;
    if (Array.isArray(actions) && actions.length > 0) {
      const withStage = actions
        .map((a) => ({
          stageId: a?.stage_id ?? a?.stageId ?? a?.stage?.id ?? null,
          createdAt: a?.created_at ?? a?.createdAt ?? null,
        }))
        .filter((a) => a.stageId !== null && a.stageId !== undefined);

      if (withStage.length > 0) {
        withStage.sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });
        if (withStage[0].stageId !== null && withStage[0].stageId !== undefined) {
          return String(withStage[0].stageId);
        }
      }
    }

    // Fallback: if lead has any actions but stageId isn't included in action payloads,
    // prefer the lead's current stage (it should already reflect the latest action stage).
    const stageFromLeadId = lead?.stage_id ?? lead?.stageId ?? lead?.stage?.id ?? null;
    if (hasAnyActions && stageFromLeadId !== null && stageFromLeadId !== undefined && String(stageFromLeadId).trim() !== '') {
      return String(stageFromLeadId);
    }

    // Also support case where lead.stage is the stage name or status (e.g., 'Pending').
    const stageFromLeadName = lead?.stage || lead?.status || lead?.stage_name || null;
    const mappedId = getStageIdFromStageName(stageFromLeadName);
    if (mappedId) return mappedId;

    return null;
  };

  const [stagePrefillAttempted, setStagePrefillAttempted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStagePrefillAttempted(false);
  }, [isOpen, lead?.id]);

  useEffect(() => {
    if (!isOpen) return;
    if (!user?.id) return;
    if (!Array.isArray(stages) || stages.length === 0) return;
    if (actionData.stage_id) return;
    if (stagePrefillAttempted) return;

    setStagePrefillAttempted(true);

    const leadLastActionStageId = getLeadLastActionStageId();
    if (leadLastActionStageId && applyStageSelection(leadLastActionStageId)) return;

    const fallbackFromLeadName = getStageIdFromStageName(lead?.stage || lead?.status || lead?.stage_name || '');
    if (fallbackFromLeadName && applyStageSelection(fallbackFromLeadName)) return;

    // Final fallback: fetch full lead details to get actions/stage reliably
    let cancelled = false;
    (async () => {
      try {
        if (!lead?.id) return;
        const res = await api.get(`/api/leads/${lead.id}`);
        const fullLead = res?.data?.data ?? res?.data;
        if (cancelled || !fullLead) return;

        const actions = fullLead?.actions || fullLead?.lead_actions || fullLead?.leadActions;
        const stageIdFromActions = Array.isArray(actions) && actions.length > 0
          ? actions
              .map((a) => ({
                stageId: a?.stage_id ?? a?.stageId ?? a?.stage?.id ?? null,
                createdAt: a?.created_at ?? a?.createdAt ?? null,
              }))
              .filter((a) => a.stageId !== null && a.stageId !== undefined)
              .sort((a, b) => {
                const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return tb - ta;
              })?.[0]?.stageId
          : null;

        const stageId =
          stageIdFromActions ??
          fullLead?.latestAction?.stage_id ??
          fullLead?.latest_action?.stage_id ??
          fullLead?.lastAction?.stage_id ??
          fullLead?.last_action?.stage_id ??
          fullLead?.stage_id ??
          fullLead?.stage?.id ??
          null;

        const hasAnyActions = Array.isArray(actions) ? actions.length > 0 : false;
        if (hasAnyActions && stageId && applyStageSelection(stageId)) return;
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id, stages, actionData.stage_id, lead?.id, stagePrefillAttempted]);

  const [cancelReasons, setCancelReasons] = useState([]);

  useEffect(() => {
    const fetchCancelReasons = async () => {
      try {
        const response = await api.get('/api/cancel-reasons');
        setCancelReasons(response.data);
      } catch (error) {
        console.error('Failed to fetch cancel reasons:', error);
      }
    };
    fetchCancelReasons();
  }, []);

  // Auto-calculate Total Price for General Reservation
  useEffect(() => {
    if (actionData.nextAction === 'reservation' && actionData.reservationType === 'general') {
      const total = actionData.reservationGeneralItems.reduce((sum, item) => {
        return sum + (Number(item.quantity || 0) * Number(item.price || 0));
      }, 0);

      setActionData(prev => {
        if (prev.reservationAmount === total) return prev;
        return { ...prev, reservationAmount: total };
      });
    }
  }, [actionData.reservationGeneralItems, actionData.nextAction, actionData.reservationType]);

  const actionTypes = [
    { value: 'call', label: isArabic ? 'مكالمة' : 'Call', icon: FaPhone, color: 'bg-blue-500' },
    { value: 'whatsapp', label: 'WhatsApp', icon: FaComments, color: 'bg-green-500' },
    { value: 'email', label: isArabic ? 'بريد' : 'Email', icon: FaEnvelope, color: 'bg-yellow-500' },
    { value: 'google_meet', label: 'Google Meet', icon: FaCalendarAlt, color: 'bg-purple-500' },
    { value: 'sms', label: isArabic ? 'رسالة' : 'Sms', icon: FaFileAlt, color: 'bg-teal-500' },
    { value: 'comment', label: isArabic ? 'تعليق' : 'Comment', icon: FaComments, color: 'bg-gray-500' },
    { value: 'note', label: isArabic ? 'ملاحظة' : 'Note', icon: FaFileAlt, color: 'bg-amber-500' }
  ];

  const leadPermissions = lead?.permissions || {};

  const pickNumericId = (...vals) => {
    for (const v of vals) {
      if (v === undefined || v === null) continue;
      if (typeof v === 'object') {
        const oid = v.id ?? v.user_id ?? v.userId;
        if (oid !== undefined && oid !== null && String(oid).match(/^\\d+$/)) return String(oid);
        continue;
      }
      const s = String(v).trim();
      if (s.match(/^\\d+$/)) return s;
    }
    return null;
  };

  const roleLower = String(user?.role || '').toLowerCase();
  const isSalesPersonUser =
    roleLower.includes('sales person') ||
    roleLower.includes('salesperson') ||
    roleLower.includes('sales_person');

  // Ownership MUST be based on the real assignment id, not display fields like `sales_person` (string).
  const assignedToId = pickNumericId(
    lead?.assigned_to_id,
    lead?.assignedSalesId,
    lead?.assigned_sales_id,
    lead?.salesPersonId,
    lead?.sales_person_id,
    lead?.employeeId,
    lead?.employee_id,
    lead?.assigneeId,
    lead?.assignee_id,
    lead?.assignedUserId,
    lead?.assigned_user_id,
    lead?.assigned_to,
    lead?.assignedTo,
    lead?.assignedAgent?.id,
    lead?.assigned_agent?.id,
    lead?.assigned_sales
  );

  const createdById = pickNumericId(
    lead?.created_by,
    lead?.createdBy,
    lead?.created_by_id,
    lead?.creator_id,
    lead?.creator?.id,
    lead?.creatorId
  );

  const isOwnerById = assignedToId && String(assignedToId) === String(user?.id);
  const isOwnerByCreatorFallback =
    !assignedToId && isSalesPersonUser && createdById && String(createdById) === String(user?.id);

  // NOTE: Do not trust `isOwnerProp` (some callers computed it using display fields).
  // Owner is derived only from assignment id (or the safe Sales-Person creator fallback for legacy data).
  const isOwner = Boolean(isOwnerById || isOwnerByCreatorFallback);

  // Permission rule (per requirements): Only the assigned Sales Person (Lead Owner) can add actions / reopen leads.
  // Do not expand this to creator/manager/direct manager fallbacks.
  const canAddAction = isOwner;
  const filteredActionTypes = canAddAction ? actionTypes : [];

  const callSubTypes = [
    { value: 'incoming', label: isArabic ? 'وارد' : 'Incoming' },
    { value: 'outgoing', label: isArabic ? 'صادر' : 'Outgoing' },
    { value: 'missed', label: isArabic ? 'فائتة' : 'Missed' }
  ];

  const emailSubTypes = [
    { value: 'sent', label: isArabic ? 'مرسل' : 'Sent' },
    { value: 'reply', label: isArabic ? 'رد' : 'Reply' }
  ];

  const nextActionOptions = [
    { value: 'follow_up', label: isArabic ? 'متابعة' : 'Follow Up' },
    { value: 'meeting', label: isArabic ? 'اجتماع' : 'Meeting' },
    { value: 'proposal', label: isArabic ? 'عرض سعر' : 'Proposal' },
    { value: 'reservation', label: isArabic ? 'حجز' : 'Reservation' },
    { value: 'closing_deals', label: isArabic ? 'إغلاق الصفقات' : 'Closing Deals' },
    { value: 'rent', label: isArabic ? 'إيجار' : 'Rent' },
    { value: 'cancel', label: isArabic ? 'إلغاء' : 'Cancel' }
  ];

  const meetingTypes = [
    { value: 'introduction', label: isArabic ? 'اجتماع تعريفي' : 'Introduction Meeting' },
    { value: 'follow_up', label: isArabic ? 'اجتماع متابعة' : 'Follow-up Meeting' },
    { value: 'presentation', label: isArabic ? 'اجتماع عرض' : 'Presentation Meeting' },
    { value: 'negotiation', label: isArabic ? 'اجتماع تفاوض' : 'Negotiation Meeting' }
  ];

  const meetingLocations = [
    { value: 'indoor', label: isArabic ? 'داخلي' : 'Indoor' },
    { value: 'outdoor', label: isArabic ? 'خارجي' : 'Outdoor' },
    { value: 'online', label: isArabic ? 'عبر الإنترنت' : 'Online' },
    { value: 'client_office', label: isArabic ? 'مكتب العميل' : 'Client Office' }
  ];

  const reservationTypes = [
    { value: 'project', label: isArabic ? 'مشروع' : 'Project' },
    { value: 'general', label: isArabic ? 'عام' : 'General' }
  ];

  const meetingStatuses = [
    { value: 'done', label: isArabic ? 'تم الاجتماع' : 'Meeting Done', color: 'bg-green-500' },
    { value: 'no_show', label: isArabic ? 'لم يحضر (ميسد)' : 'No Show (Missed)', color: 'bg-red-500' }
  ];

  const handleStatusChange = (status) => {
    const selectedStatus = meetingStatuses.find(ms => ms.value === status);
    setActionData(prev => ({
      ...prev,
      meeting_status: status,
      doneMeeting: status === 'done',
      notes: selectedStatus ? selectedStatus.label : prev.notes
    }));
  };

  const handleAddGeneralRow = () => {
    setActionData(prev => ({
      ...prev,
      reservationGeneralItems: [...prev.reservationGeneralItems, { category: '', item: '', quantity: 1, price: 0 }]
    }));
  };

  const handleRemoveGeneralRow = (index) => {
    if (actionData.reservationGeneralItems.length > 1) {
      setActionData(prev => ({
        ...prev,
        reservationGeneralItems: prev.reservationGeneralItems.filter((_, i) => i !== index)
      }));
    }
  };

  const handleGeneralRowChange = (index, field, value) => {
    setActionData(prev => {
      const newItems = [...prev.reservationGeneralItems];
      newItems[index] = { ...newItems[index], [field]: value };

      // Auto-update price if item changes
      if (field === 'item') {
        const selectedItem = items.find(opt => opt.id == value);
        if (selectedItem) {
          newItems[index].price = selectedItem.price;
        }
      }

      return { ...prev, reservationGeneralItems: newItems };
    });
  };

  const handleUnitChange = (e) => {
    const unitId = e.target.value;
    const selectedUnit = units.find(u => u.id == unitId);

    setActionData(prev => ({
      ...prev,
      rentUnit: unitId,
      rentAmount: selectedUnit ? selectedUnit.rent_amount : prev.rentAmount
    }));
  };

  const handleQuickTimeSelect = (option) => {
    const now = new Date();
    const newDate = new Date();
    let newTime = now.toTimeString().slice(0, 5);

    if (option === 'after_1_hour') {
      newDate.setHours(now.getHours() + 1);
      newTime = newDate.toTimeString().slice(0, 5);
    } else if (option === 'after_2_hours') {
      newDate.setHours(now.getHours() + 2);
      newTime = newDate.toTimeString().slice(0, 5);
    } else if (option === 'tomorrow') {
      newDate.setDate(now.getDate() + 1);
      newDate.setHours(9, 0, 0, 0); // Default to 9 AM
      newTime = '09:00';
    } else if (option === 'next_week') {
      newDate.setDate(now.getDate() + 7);
      newDate.setHours(9, 0, 0, 0);
      newTime = '09:00';
    }

    setActionData(prev => ({
      ...prev,
      date: newDate.toISOString().split('T')[0],
      time: newTime,
      selectedQuickOption: option
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (name === 'cancelReason') {
      setActionData(prev => ({
        ...prev,
        cancelReason: value
      }));
      return;
    }

    if (name === 'stage_id') {
      setActionData(prev => ({
        ...prev,
        stage_id: value
      }));
      return;
    }

    setActionData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'file' ? files[0] : value),
      ...(name === 'actionType' ? { type: value } : {})
    }));
  };

  const handleStageChange = (e) => {
    const stageId = e.target.value;
    const stage = stages.find(s => s.id == stageId);

    if (stage) {
      const stageType = stage.type;
      const newActionType = stageType === 'cancel'
        ? 'cancel'
        : ((['proposal', 'reservation', 'closing_deals', 'rent', 'meeting'].includes(stageType)) ? stageType : 'call');

      const isTerminal = stageType === 'closing_deals' || stageType === 'cancel';

      setActionData(prev => ({
        ...prev,
        stage_id: stageId,
        nextAction: stageType,
        // If the stage implies a specific action type (like meeting, proposal), set it.
        // Otherwise (like follow_up), default to 'call' but allow user to change it.
        actionType: newActionType,
        type: newActionType,
        status: isTerminal ? 'completed' : 'pending',
        selectedQuickOption: isTerminal ? null : prev.selectedQuickOption,
        ...(stageType === 'cancel' ? { answerStatus: 'cancelled' } : {})
      }));
    } else {
      setActionData(prev => ({
        ...prev,
        stage_id: '',
        nextAction: 'follow_up',
        status: 'pending'
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canAddAction) {
      alert(isArabic ? 'غير مسموح لك بإضافة إجراء لهذا العميل' : 'You are not authorized to add actions to this lead');
      return;
    }

    // Clean up data based on reservation type to avoid confusion
    const cleanedData = { ...actionData };
    if (cleanedData.nextAction === 'reservation') {
      if (cleanedData.reservationType === 'general') {
        // If General, remove Project/Unit fields
        cleanedData.reservationProject = '';
        cleanedData.reservationUnit = '';
      } else {
        // If Project (default), remove General fields
        cleanedData.reservationCategory = '';
        cleanedData.reservationItem = '';
        cleanedData.reservationType = 'project'; // Ensure type is explicit
      }
    }

    // Helper to convert file to base64
    const fileToBase64 = (file, customName) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({
          name: customName || file.name,
          type: file.type,
          size: file.size,
          data: reader.result
        });
        reader.onerror = error => reject(error);
      });
    };

    const toast = (type, message) => {
      try {
        window.dispatchEvent(new CustomEvent('app:toast', { detail: { type, message } }));
      } catch {
        alert(message);
      }
    };

    setIsSubmitting(true);

    try {
      // Handle file attachments if any
      const selectedStage = stages.find(s => String(s.id) === String(actionData.stage_id));
      const stageName = selectedStage ? (selectedStage.name_en || selectedStage.name || 'Stage') : 'General';
      const tenantName = company?.name || 'Tenant';
      
      if (cleanedData.proposalAttachment instanceof File) {
        const file = cleanedData.proposalAttachment;
        if (file.size > 5 * 1024 * 1024) {
          toast('error', isArabic ? 'حجم المرفق كبير جدًا (الحد الأقصى 5MB).' : 'Attachment is too large (max 5MB).');
          return;
        }
        const extension = file.name.split('.').pop();
        const customName = `${stageName}_${tenantName}.${extension}`;
        cleanedData.proposalAttachment = await fileToBase64(file, customName);
      }
      if (cleanedData.rentAttachment instanceof File) {
        const file = cleanedData.rentAttachment;
        if (file.size > 5 * 1024 * 1024) {
          toast('error', isArabic ? 'حجم المرفق كبير جدًا (الحد الأقصى 5MB).' : 'Attachment is too large (max 5MB).');
          return;
        }
        const extension = file.name.split('.').pop();
        const customName = `${stageName}_${tenantName}.${extension}`;
        cleanedData.rentAttachment = await fileToBase64(file, customName);
      }

      if (cleanedData.nextAction === 'cancel' && !String(cleanedData.cancelReason || '').trim()) {
        toast('error', isArabic ? 'من فضلك اختر سبب الإلغاء' : 'Please select a cancel reason');
        return;
      }

      // For cancel actions, store the cancel reason as a comment (audit trail) instead of forcing it into notes/description.
      if (cleanedData.nextAction === 'cancel') {
        const reason = String(cleanedData.cancelReason || '').trim();
        if (reason) {
          cleanedData.type = cleanedData.type || 'cancel';
          cleanedData.actionType = cleanedData.actionType || 'cancel';
          cleanedData.comments = [
            {
              text: reason,
              userId: user?.id,
              userName: user?.name,
              createdAt: new Date().toISOString(),
              kind: 'cancel_reason',
            },
          ];
        }
      }

      // Construct description from various sources
      let finalDescription = cleanedData.notes || cleanedData.description || cleanedData.title || '';
      if (cleanedData.reservationNotes) {
        finalDescription = finalDescription ? `${finalDescription} - ${cleanedData.reservationNotes}` : cleanedData.reservationNotes;
      }

      const payload = {
        lead_id: lead.id,
        type: cleanedData.type,
        status: cleanedData.status,
        date: cleanedData.date,
        time: cleanedData.time,
        description: finalDescription, // Use constructed description
        outcome: cleanedData.answerStatus, // Map answerStatus to outcome
        stage_id: cleanedData.stage_id,
        next_action_type: cleanedData.nextAction,
        // Include all other data in the payload for the JSON column
        ...cleanedData
      };

      let response = null;
      const isMeetingPayload = payload.type === 'meeting' || payload.next_action_type === 'meeting' || cleanedData.nextAction === 'meeting';
      const meetingStatus = String(cleanedData.meeting_status || '').toLowerCase().trim();
      const isFinalMeetingStatus = meetingStatus === 'done' || meetingStatus === 'no_show';
      if (isMeetingPayload && isFinalMeetingStatus) {
        try {
          const existingRes = await api.get('/api/lead-actions', {
            params: { lead_id: lead.id, type: 'meeting', limit: 500 },
          });
          const existing = Array.isArray(existingRes.data) ? existingRes.data : (existingRes.data?.data || []);
          const scheduledCandidates = existing
            .filter(a => (a?.action_type === 'meeting' || a?.next_action_type === 'meeting'))
            .filter(a => {
              const s = String(a?.details?.meeting_status || '').toLowerCase().trim();
              const dm = String(a?.details?.doneMeeting || '').toLowerCase().trim();
              const derived = s || (dm === 'true' ? 'done' : '');
              return derived !== 'done' && derived !== 'no_show';
            })
            .sort((a, b) => (Number(b?.id || 0) - Number(a?.id || 0)));

          const exactMatch = scheduledCandidates.find(a =>
            String(a?.details?.date || '') === String(cleanedData.date || '') &&
            String(a?.details?.time || '') === String(cleanedData.time || '')
          );

          const target = exactMatch || scheduledCandidates[0];
          if (target?.id) {
            response = await api.put(`/api/lead-actions/${target.id}`, {
              details: {
                meeting_status: meetingStatus,
                doneMeeting: meetingStatus === 'done',
              },
            });
          }
        } catch (e) {
        }
      }

      if (!response) {
        response = await api.post('/api/lead-actions', payload);
      }

      if (cleanedData.stage_id) {
        const tenantId = company?.id || company?.tenant_id || company?.tenantId;
        setLastActionStageId({ userId: user?.id, tenantId, stageId: cleanedData.stage_id });
      }

      if (onSave) {
        onSave(response.data.action);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save action:', error);
      const msg =
        error?.response?.data?.message ||
        (error?.response?.data?.errors ? JSON.stringify(error.response.data.errors) : null) ||
        (isArabic ? 'فشل حفظ الأكشن' : 'Failed to save action');
      toast('error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedActionType = actionTypes.find(type => type.value === actionData.type);
  const ActionIcon = selectedActionType?.icon || FaComments;

  // Wrapper classes for overlay vs inline modes
  const overlayWrapper = inline
    ? 'relative p-0'
    : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-0 sm:p-6';
  const containerClasses = inline
    ? `${isLight ? 'bg-white text-slate-800' : 'bg-gray-800 text-white'} sm:rounded-lg shadow-xl w-full h-auto`
    : `${isLight ? 'bg-white text-slate-800' : 'bg-gray-800 text-white'} sm:rounded-lg shadow-xl w-full sm:max-w-2xl max-h-[85vh] h-auto overflow-y-auto m-0 sm:m-4`;

  useEffect(() => {
    if (!inline && isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return () => { document.body.style.overflow = prev; };
    }
  }, [inline, isOpen]);

  const isMeetingStage = lead?.stage && (
    String(lead.stage).toLowerCase().includes('meeting') ||
    String(lead.stage).includes('اجتماع')
  );

  const isMeetingAction =
    actionData.nextAction === 'meeting' ||
    actionData.actionType === 'meeting' ||
    actionData.actionType === 'google_meet';

  const content = (
    <div className={overlayWrapper}>
      <div className={containerClasses}>
        {/* Header */}
        <div className={`flex items-center justify-between p-8 border-b ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
          <div className="flex items-center gap-3">
            <h2 className={`text-xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {isArabic ? 'إضافة أكشن' : 'Add Action'}
            </h2>
          </div>
          {!inline && (
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="btn btn-sm btn-circle btn-ghost text-red-500"
              >
                <FaTimes size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Subtitle */}
        <div className="px-8 pt-6">
          <p className={`${isLight ? 'text-slate-600' : 'text-gray-400'} text-sm`}>
            {isArabic
              ? (actionData.nextAction === 'meeting' ? 'اختر تفاصيل الاجتماع' : 'اختر نوع الأكشن وحدد التفاصيل')
              : (actionData.nextAction === 'meeting' ? 'Choose meeting details' : 'Select action type and schedule details')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {!canAddAction ? (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
              <FaTimes className="mx-auto text-red-500 mb-3 text-2xl" />
              <p className="text-red-600 dark:text-red-400 font-medium">
                {isArabic ? 'غير مسموح لك بإضافة إجراء لهذا العميل. الصلاحية متاحة فقط للمسؤول عن العميل.' : 'You are not authorized to add actions to this lead. Only the assigned user can perform actions.'}
              </p>
            </div>
          ) : (
            <>
              {/* Stage / Next Action Selection - Only for Lead Owner or Super Admin */}
              {canAddAction && (
                <div>
                  <label className={`block text-sm font-medium mb-3 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>
                    {isArabic ? 'المرحلة / الإجراء' : 'Stage / Action'}
                  </label>
                  <div className="relative">
                    <select
                      name="stage_id"
                      value={actionData.stage_id || ''}
                      onChange={handleStageChange}
                      className={`${isLight ? `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900` : `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}`}
                    >
                      <option value="">{isArabic ? 'اختر المرحلة' : 'Select Stage'}</option>
                      {stages.map(stage => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                    <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                  </div>
                </div>
              )}

              {/* Action Type Selection - Only for Follow Up */}
              {['follow_up'].includes(actionData.nextAction) && (
                <div className={`grid ${['call', 'email'].includes(actionData.actionType) ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-4`}>
                  <div>
                    <label className={`block text-sm font-medium mb-3 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>
                      {isArabic ? 'نوع الأكشن' : 'Action Type'}
                    </label>
                    <div className="relative">
                      <select
                        name="actionType"
                        value={actionData.actionType}
                        onChange={handleInputChange}
                        className={`${isLight ? `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900` : `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}`}
                      >
                        {filteredActionTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                    </div>
                  </div>

                  {/* Sub Type Selection for Call/Email */}
                  {actionData.actionType === 'call' && (
                    <div>
                      <label className={`block text-sm font-medium mb-3 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>
                        {isArabic ? 'نوع المكالمة' : 'Call Type'}
                      </label>
                      <div className="relative">
                        <select
                          name="subType"
                          value={actionData.subType || ''}
                          onChange={handleInputChange}
                          className={`${isLight ? `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900` : `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}`}
                        >
                          <option value="">{isArabic ? 'اختر' : 'Select'}</option>
                          {callSubTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                        <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                      </div>
                    </div>
                  )}

                  {actionData.actionType === 'email' && (
                    <div>
                      <label className={`block text-sm font-medium mb-3 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>
                        {isArabic ? 'نوع البريد' : 'Email Type'}
                      </label>
                      <div className="relative">
                        <select
                          name="subType"
                          value={actionData.subType || ''}
                          onChange={handleInputChange}
                          className={`${isLight ? `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900` : `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}`}
                        >
                          <option value="">{isArabic ? 'اختر' : 'Select'}</option>
                          {emailSubTypes.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                        <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Answer Status Toggle */}
          {actionData.type && actionData.nextAction !== 'cancel' && (
            <div className={`flex items-center gap-4 ${isArabic ? 'justify-between' : 'justify-between'}`}>
              <button
                type="button"
                onClick={() => setActionData(prev => ({
                  ...prev,
                  answerStatus: prev.answerStatus === 'answer' ? 'no_answer' : 'answer',
                  notes: prev.answerStatus === 'answer'
                    ? 'no answer'
                    : (prev.notes === 'no answer' ? '' : prev.notes)
                }))}
                className={`flex items-center gap-3 px-6 py-4 rounded-xl transition-all font-medium backdrop-blur-md bg-white/10 hover:bg-white/20 shadow-2xl shadow-black/30 hover:shadow-black/50 border ${actionData.answerStatus === 'answer'
                  ? 'text-green-300 hover:text-green-200 shadow-green-500/20 border-green-400/40'
                  : 'text-red-300 hover:text-red-200 shadow-red-500/20 border-red-400/40'
                  }`}
              >
                {actionData.answerStatus === 'answer' ? (
                  <>
                    <FaToggleOn className="text-lg text-green-400" />
                    <span>{isArabic ? 'إجابة' : 'Answer'}</span>
                  </>
                ) : (
                  <>
                    <FaToggleOff className="text-lg text-red-400" />
                    <span>{isArabic ? 'لا يوجد إجابة' : 'No Answer'}</span>
                  </>
                )}
              </button>

              {/* Done Meeting Toggle - REPLACED WITH STATUS DROPDOWN */}
              {isMeetingAction && (
                <div className="flex flex-wrap gap-2">
                  {meetingStatuses.map((ms) => (
                    <button
                      key={ms.value}
                      type="button"
                      onClick={() => handleStatusChange(ms.value)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all border ${
                        actionData.meeting_status === ms.value
                          ? `${ms.color} text-white border-transparent shadow-lg scale-105`
                          : `${isLight ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50' : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'}`
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${actionData.meeting_status === ms.value ? 'bg-white' : ms.color}`}></span>
                      {ms.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Warning Message for Missed Meetings */}
          {lead?.missed_meetings_count >= 3 && (
            <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm animate-pulse rounded-lg">
              <p className="font-bold">{isArabic ? 'تنبيه: العميل فوت أكثر من اجتماع!' : 'Warning: High No-Show Rate!'}</p>
              <p>{isArabic ? 'هذا العميل فوت 3 اجتماعات أو أكثر. يرجى التأكد من الجدية قبل الجدولة مرة أخرى.' : 'This lead has missed 3 or more meetings. Verify commitment before scheduling again.'}</p>
            </div>
          )}

          {/* Meeting Type and Location */}
          {actionData.nextAction === 'meeting' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {isArabic ? 'نوع الاجتماع' : 'Meeting Type'}
                </label>
                <div className="space-y-2">
                  <select
                    name="meetingType"
                    value={actionData.meetingType}
                    onChange={handleInputChange}
                    className={`${isLight ? `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900` : `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}`}
                  >
                    {meetingTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {isArabic ? 'مكان الاجتماع' : 'Meeting Location'}
                </label>
                <div className="relative">
                  <select
                    name="meetingLocation"
                    value={actionData.meetingLocation}
                    onChange={handleInputChange}
                    className={`${isLight ? `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900` : `w-full px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}`}
                  >
                    {meetingLocations.map(location => (
                      <option key={location.value} value={location.value}>
                        {location.label}
                      </option>
                    ))}
                  </select>
                  <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                </div>
              </div>
            </div>
          )}

          {/* Proposal fields */}
          {actionData.nextAction === 'proposal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{isArabic ? 'قيمة العرض' : 'Proposal Amount'}</label>
                <input name="proposalAmount" type="number" value={actionData.proposalAmount} onChange={handleInputChange} className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{isArabic ? 'الخصم %' : 'Discount %'}</label>
                <input name="proposalDiscount" type="number" value={actionData.proposalDiscount} onChange={handleInputChange} className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{isArabic ? 'مدة الصلاحية (أيام)' : 'Validity Days'}</label>
                <input name="proposalValidityDays" type="number" value={actionData.proposalValidityDays} onChange={handleInputChange} className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{isArabic ? 'مرفق' : 'Attachment'}</label>
                <input name="proposalAttachment" type="file" onChange={handleInputChange} className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`} />
              </div>
            </div>
          )}

          {/* Reservation fields */}
          {actionData.nextAction === 'reservation' && (
            <div className="space-y-4">
              {/* Type Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'النوع' : 'Type'}</label>
                <div className="relative">
                  <select
                    name="reservationType"
                    value={actionData.reservationType}
                    onChange={handleInputChange}
                    className={`${isLight ? `w-full appearance-none px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900` : `w-full appearance-none px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}`}
                  >
                    {reservationTypes.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                </div>
              </div>

              {actionData.reservationType === 'project' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'العميل' : 'Customer'}</label>
                    <input type="text" value={lead?.name || ''} disabled className={`${isLight ? 'w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-slate-500' : 'w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-400'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'المشروع' : 'Project'}</label>
                    <div className="relative">
                      <select
                        name="reservationProject"
                        value={actionData.reservationProject}
                        onChange={(e) => {
                          handleInputChange(e);
                          // Clear unit when project changes
                          setActionData(prev => ({ ...prev, reservationUnit: '', reservationProject: e.target.value }));
                        }}
                        className={`${isLight ? `w-full appearance-none px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900` : `w-full appearance-none px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}`}
                      >
                        <option value="">{isArabic ? 'اختر' : 'Select'}</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                      <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'الوحدة' : 'Unit'}</label>
                    <div className="relative">
                      <select
                        name="reservationUnit"
                        value={actionData.reservationUnit}
                        onChange={handleInputChange}
                        className={`${isLight ? `w-full appearance-none px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900` : `w-full appearance-none px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}`}
                      >
                        <option value="">{isArabic ? 'اختر' : 'Select'}</option>
                        {units
                          .filter(unit => !actionData.reservationProject || unit.project_id == actionData.reservationProject)
                          .map((unit) => (
                            <option key={unit.id} value={unit.id}>{unit.name}</option>
                          ))}
                      </select>
                      <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'قيمة الحجز' : 'Reservation Amount'}</label>
                    <input name="reservationAmount" type="number" value={actionData.reservationAmount} onChange={handleInputChange} className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'العميل' : 'Customer'}</label>
                    <input type="text" value={lead?.name || ''} disabled className={`${isLight ? 'w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-slate-500' : 'w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-400'}`} />
                  </div>

                  {/* Dynamic Rows */}
                  <div className="space-y-3">
                    {actionData.reservationGeneralItems.map((row, index) => (
                      <div key={index} className="flex flex-wrap md:flex-row gap-3 items-end">
                        <div className="flex-1 min-w-[150px]">
                          <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'الفئة' : 'Category'}</label>
                          <div className="relative">
                            <select
                              value={row.category}
                              onChange={(e) => handleGeneralRowChange(index, 'category', e.target.value)}
                              className={`${isLight ? 'w-full appearance-none px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900' : 'w-full appearance-none px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white'}`}
                            >
                              <option value="">{isArabic ? 'اختر' : 'Select'}</option>
                              {categories.map((opt) => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                              ))}
                            </select>
                            <FaChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                          <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'العنصر' : 'Item'}</label>
                          <div className="relative">
                            <select
                              value={row.item}
                              onChange={(e) => handleGeneralRowChange(index, 'item', e.target.value)}
                              className={`${isLight ? 'w-full appearance-none px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900' : 'w-full appearance-none px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white'}`}
                            >
                              <option value="">{isArabic ? 'اختر' : 'Select'}</option>
                              {items
                                .filter(item => {
                                  if (!row.category) return true;
                                  const catName = categories.find(c => c.id == row.category)?.name;
                                  return item.category_id == row.category || (catName && item.category === catName);
                                })
                                .map((opt) => (
                                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                                ))}
                            </select>
                            <FaChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                          </div>
                        </div>
                        <div className="w-24">
                          <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'الكمية' : 'Qty'}</label>
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleGeneralRowChange(index, 'quantity', e.target.value)}
                            className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`}
                          />
                        </div>
                        <div className="w-32">
                          <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'السعر' : 'Price'}</label>
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) => handleGeneralRowChange(index, 'price', e.target.value)}
                            className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`}
                          />
                        </div>
                        {actionData.reservationGeneralItems.length > 1 && (
                          <button
                            onClick={() => handleRemoveGeneralRow(index)}
                            className="p-2.5 mb-[1px] text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title={isArabic ? 'حذف' : 'Remove'}
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddGeneralRow}
                      className={`flex items-center gap-2 text-sm font-medium ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                    >
                      <FaPlus /> {isArabic ? 'إضافة صف آخر' : 'Add another row'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'إجمالي السعر' : 'Total Price'}</label>
                      <input
                        name="reservationAmount"
                        type="number"
                        value={actionData.reservationAmount}
                        readOnly
                        className={`${isLight ? 'w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-slate-700 cursor-not-allowed' : 'w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-400 cursor-not-allowed'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'ملاحظات' : 'Notes'}</label>
                      <textarea name="reservationNotes" value={actionData.reservationNotes} onChange={handleInputChange} rows="2" className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'} resize-none`} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Closing Deals fields */}
          {actionData.nextAction === 'closing_deals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{isArabic ? 'الإيرادات' : 'Revenue'}</label>
                <input name="closingRevenue" type="number" value={actionData.closingRevenue} onChange={handleInputChange} className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`} />
              </div>
            </div>
          )}

          {/* Rent fields */}
          {actionData.nextAction === 'rent' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{isArabic ? 'الوحدة' : 'Unit'}</label>
                <div className="relative">
                  <select
                    name="rentUnit"
                    value={actionData.rentUnit}
                    onChange={handleUnitChange}
                    className={`${isLight ? 'w-full appearance-none px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900' : 'w-full appearance-none px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white'}`}
                  >
                    <option value="">{isArabic ? 'اختر' : 'Select'}</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                  <FaChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{isArabic ? 'قيمة الإيجار' : 'Rent Amount'}</label>
                <input name="rentAmount" type="number" value={actionData.rentAmount} onChange={handleInputChange} className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{isArabic ? 'بداية الإيجار' : 'Rent Start'}</label>
                <input name="rentStart" type="date" value={actionData.rentStart} onChange={handleInputChange} className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{isArabic ? 'نهاية الإيجار' : 'Rent End'}</label>
                <input name="rentEnd" type="date" value={actionData.rentEnd} onChange={handleInputChange} className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{isArabic ? 'مرفق' : 'Attachment'}</label>
                <input name="rentAttachment" type="file" onChange={handleInputChange} className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-slate-900' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white'}`} />
              </div>
            </div>
          )}

          {/* Cancel fields */}
          {actionData.nextAction === 'cancel' && (
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-900' : 'text-gray-300'}`}>{isArabic ? 'سبب الإلغاء' : 'Cancel Reason'}</label>
              <div className="relative">
                <select
                  name="cancelReason"
                  value={actionData.cancelReason}
                  onChange={handleInputChange}
                  className={`${isLight ? `w-full appearance-none px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900` : `w-full appearance-none px-3 py-2 ${isRTL ? 'pl-10' : 'pr-10'} bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white`}`}
                >
                  <option value="">{isArabic ? 'اختر السبب' : 'Select Reason'}</option>
                  {cancelReasons.map((r) => (
                    <option key={r.id} value={isArabic && r.title_ar ? r.title_ar : r.title}>
                      {isArabic && r.title_ar ? r.title_ar : r.title}
                    </option>
                  ))}
                </select>
                <FaChevronDown className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-500' : 'text-gray-300'} pointer-events-none`} />
              </div>
            </div>
          )}

          {/* Schedule Date */}
          {!['closing_deals', 'cancel'].includes(actionData.nextAction) && (
            <div className="space-y-4">
              <h3 className={`text-lg font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {isArabic ? 'تاريخ الجدولة' : 'Schedule Date'}
              </h3>

              {/* Split layout: left input (50%), right buttons (50%) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Left: Date and Time Input with Calendar Icon */}
                <div className="space-y-2">
                  <DatePicker
                     selected={getScheduleDay()}
                     onChange={(d) => {
                       if (!d) return;
                       setScheduleDateOnly(d);
                     }}
                    onClickOutside={handleScheduleClickOutside}
                    onCalendarClose={() => setSchedulePickerOpen(false)}
                    open={schedulePickerOpen}
                    shouldCloseOnSelect={false}
                    closeOnScroll={false}
                    dateFormat={isArabic ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
                    popperProps={{ strategy: 'fixed' }}
                    popperModifiers={[
                      offset(8),
                      flip({ padding: 8 }),
                      shift({ padding: 8 }),
                      size({
                        padding: 8,
                        apply({ availableHeight, elements }) {
                          Object.assign(elements.floating.style, {
                            maxHeight: `${availableHeight}px`,
                            overflowY: 'auto',
                          });
                        },
                      }),
                    ]}
                    popperPlacement={isRTL ? 'bottom-end' : 'bottom-start'}
                    popperContainer={SchedulePopperContainer}
                    popperClassName="z-[10050]"
                    calendarContainer={ScheduleCalendarContainer}
                    calendarClassName="add-action-datepicker"
                    customInput={<ScheduleDateTimeInput />}
                  />
                </div>

                {/* Right: Buttons grouped in columns (each column has two buttons) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickTimeSelect('after_1_hour')}
                      className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${actionData.selectedQuickOption === 'after_1_hour' ? 'bg-teal-600 text-white border-teal-500 ring-2 ring-teal-400/40' : (isLight ? 'bg-gray-100 text-slate-700 border-gray-300 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 border-gray-500 hover:bg-gray-600')}`}
                    >
                      {isArabic ? 'بعد ساعة' : 'After 1 hour'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickTimeSelect('after_2_hours')}
                      className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${actionData.selectedQuickOption === 'after_2_hours' ? 'bg-teal-600 text-white border-teal-500 ring-2 ring-teal-400/40' : (isLight ? 'bg-gray-100 text-slate-700 border-gray-300 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 border-gray-500 hover:bg-gray-600')}`}
                    >
                      {isArabic ? 'بعد ساعتين' : 'After 2 hours'}
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickTimeSelect('tomorrow')}
                      className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${actionData.selectedQuickOption === 'tomorrow' ? 'bg-teal-600 text-white border-teal-500 ring-2 ring-teal-400/40' : (isLight ? 'bg-gray-100 text-slate-700 border-gray-300 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 border-gray-500 hover:bg-gray-600')}`}
                    >
                      {isArabic ? 'غداً' : 'Tomorrow'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickTimeSelect('next_week')}
                      className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${actionData.selectedQuickOption === 'next_week' ? 'bg-teal-600 text-white border-teal-500 ring-2 ring-teal-400/40' : (isLight ? 'bg-gray-100 text-slate-700 border-gray-300 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 border-gray-500 hover:bg-gray-600')}`}
                    >
                      {isArabic ? 'الأسبوع القادم' : 'Next Week'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comment */}
          {actionData.nextAction !== 'cancel' && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
              {isArabic ? 'تعليق *' : 'Comment *'}
            </label>
            <textarea
              name="notes"
              value={actionData.notes}
              onChange={handleInputChange}
              placeholder={isArabic ? 'اكتب تعليقك هنا. يُسمح بعدد غير محدود من الكلمات...' : 'Write your comment here. Unlimited words are allowed...'}
              rows="4"
              className={`${isLight ? 'w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-gray-400' : 'w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400'} resize-none`}
              required
            />
          </div>
          )}

          {/* Buttons */}
          <div className="flex justify-between gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ الأكشن' : 'Save Action')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (inline) return content;
  if (!isOpen) return null;
  return createPortal(content, document.body);
};

export default AddActionModal;
