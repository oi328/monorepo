import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../shared/context/ThemeProvider';
import { useAppState } from '../shared/context/AppStateProvider';
import { FaUser, FaEye, FaEdit, FaUsers, FaCheckCircle, FaEllipsisH, FaTimes, FaPhone, FaEnvelope, FaBuilding, FaMapMarkerAlt, FaCalendarAlt, FaComments } from 'react-icons/fa';
import EditLeadModal from './EditLeadModal';
import LeadDetailsModal from './LeadDetailsModal';
import AddActionModal from './AddActionModal';
import { getLeadPermissionFlags } from '../services/leadPermissions';
import { getPhoneLines } from '../shared/utils/phoneDisplay'

const LeadModal = ({ isOpen, onClose, lead, assignees = [], onAssign, canAddAction = true }) => {
  const { t } = useTranslation();
  const { theme, resolvedTheme } = useTheme();
  const { user } = useAppState();
  const isLight = resolvedTheme === 'light';
  const leadPermissionFlags = getLeadPermissionFlags(user);
  const canOpenAddAction = canAddAction && leadPermissionFlags.canAddAction;
  const canOpenEditLead = leadPermissionFlags.canEditInfo || leadPermissionFlags.canEditPhone;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddActionModal, setShowAddActionModal] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [assignStep, setAssignStep] = useState('teams'); // 'teams' or 'members'
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Mock Teams Data
  const TEAMS_DATA = {
    'Sales Team A': ['Ahmed Ali', 'Sara Noor'],
    'Sales Team B': ['Ibrahim'],
    'Marketing': ['Dina', 'Elias']
  };

  const assignMenuRef = useRef(null);
  const assignMenuBtnRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showAssignMenu) {
        const menuEl = assignMenuRef.current;
        const btnEl = assignMenuBtnRef.current;
        if (menuEl && !menuEl.contains(e.target) && btnEl && !btnEl.contains(e.target)) {
          setShowAssignMenu(false);
          setAssignStep('teams');
          setSelectedTeam(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssignMenu]);
  
  if (!isOpen || !lead) return null;

  const bgColor = isLight ? 'bg-white' : 'bg-gray-900';
  const textColor = isLight ? 'text-gray-800' : 'text-gray-100';
  const borderColor = isLight ? 'border-gray-200' : 'border-gray-700';
  const secondaryTextColor = isLight ? 'text-gray-600' : 'text-gray-400';

  const handleAddAction = (newAction) => {
    console.log('إضافة أكشن جديد:', newAction);
    // يمكن إضافة منطق حفظ الأكشن الجديد هنا
  };

  const handleEditLead = (updatedLead) => {
    console.log('تحديث بيانات العميل:', updatedLead);
    // يمكن إضافة منطق تحديث بيانات العميل هنا
  };

  const handleViewDetails = () => {
    console.log('عرض تفاصيل العميل والأكشنز:', lead);
    setShowDetailsModal(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div
        className={`relative w-full sm:w-[90%] sm:max-w-2xl max-h-[85vh] h-auto overflow-y-auto rounded-none sm:rounded-2xl border shadow-xl ${bgColor} ${borderColor} ${textColor}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${borderColor}`}>
          <div className="flex items-center gap-3">
            <FaUser className="text-blue-600" size={20} />
            <h2 className="text-xl font-semibold text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text">{t('Lead Details')}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Action Buttons */}
            <button
              onClick={handleViewDetails}
              className="btn btn-sm btn-circle bg-blue-600 hover:bg-blue-700 text-white border-none"
              title="View"
            >
              <FaEye size={16} />
            </button>
            {canOpenAddAction && (
              <button
                onClick={() => setShowAddActionModal(true)}
                className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none"
                title="Add Action"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            )}
            {canOpenEditLead && (
              <button
                onClick={() => setShowEditModal(true)}
                className={`btn btn-sm btn-circle btn-ghost transition-colors ${secondaryTextColor} hover:text-blue-600`}
                title="Edit"
              >
                <FaEdit size={16} />
              </button>
            )}
            <div className="relative">
              <button
                ref={assignMenuBtnRef}
                onClick={() => setShowAssignMenu(!showAssignMenu)}
                className="btn btn-sm btn-circle bg-blue-600 hover:bg-blue-700 text-white border-none"
                title="Assign"
              >
                <FaUsers size={16} />
              </button>
              {showAssignMenu && (
                <div 
                  ref={assignMenuRef}
                  className={`${isLight ? 'bg-white/90 backdrop-blur-md border border-gray-200 text-slate-800' : 'bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white'} absolute right-0 top-10 z-50 rounded-xl shadow-xl min-w-[200px] p-2`}
                >
                  <div className="text-xs font-semibold px-3 py-2 text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    {assignStep === 'members' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssignStep('teams');
                          setSelectedTeam(null);
                        }}
                        className="hover:text-blue-600"
                      >
                        {t('Back') || '←'}
                      </button>
                    )}
                    {assignStep === 'teams' 
                      ? t('Select Team')
                      : t('Select Person')
                    }
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {assignStep === 'teams' ? (
                      Object.keys(TEAMS_DATA).map((team) => (
                        <button
                          key={team}
                          onClick={() => {
                            setSelectedTeam(team);
                            setAssignStep('members');
                          }}
                          className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-black/5 text-sm"
                        >
                          <span className="truncate">{team}</span>
                          <span className="text-xs text-gray-400">
                            ({TEAMS_DATA[team].length})
                          </span>
                        </button>
                      ))
                    ) : (
                      TEAMS_DATA[selectedTeam] && TEAMS_DATA[selectedTeam].length > 0 ? (
                        TEAMS_DATA[selectedTeam].map((assignee) => (
                          <button
                            key={assignee}
                            onClick={() => {
                              if (onAssign) onAssign(assignee);
                              setShowAssignMenu(false);
                              setAssignStep('teams');
                              setSelectedTeam(null);
                            }}
                            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-black/5 text-sm ${lead.assignedTo === assignee ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : ''}`}
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                              {assignee.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{assignee}</span>
                            {lead.assignedTo === assignee && <FaCheckCircle className="ml-auto text-xs" />}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 italic">
                          {t('No sales persons found')}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => console.log('More options for lead:', lead)}
              className={`btn btn-sm btn-circle btn-ghost transition-colors ${secondaryTextColor} hover:text-blue-600`}
              title="More Options"
            >
              <FaEllipsisH size={16} />
            </button>
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost text-red-500"
            >
              <FaTimes size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FaUser className={secondaryTextColor} size={16} />
                <div className="flex-1">
                  <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Full Name')}</label>
                  <p className="text-lg font-semibold">{lead.leadName || lead.name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaPhone className={secondaryTextColor} size={16} />
                <div className="flex-1">
                  <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Mobile')}</label>
                  {(() => {
                    const raw = lead.mobile || lead.phone || ''
                    const lines = getPhoneLines(raw, { showFull: true, defaultCountryCode: lead.phone_country || lead.phoneCountry || '+20' })
                    if (!lines.length) return <p className="text-lg">{'N/A'}</p>
                    return (
                      <div className="text-lg space-y-1">
                        {lines.map((l, idx) => (
                          <div key={idx} dir="ltr">{l.display}</div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaEnvelope className={secondaryTextColor} size={16} />
                <div className="flex-1">
                  <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Email')}</label>
                  <p className="text-lg">{lead.email || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FaBuilding className={secondaryTextColor} size={16} />
                <div className="flex-1">
                  <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Company')}</label>
                  <p className="text-lg">{lead.company || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaMapMarkerAlt className={secondaryTextColor} size={16} />
                <div className="flex-1">
                  <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Location')}</label>
                  <p className="text-lg">{lead.location || lead.address || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <FaCalendarAlt className={secondaryTextColor} size={16} />
                <div className="flex-1">
                  <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Stage Date')}</label>
                  <p className="text-lg">{lead.stageDate || lead.createdAt || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status and Category */}
          <div className={`p-4 rounded-lg border ${borderColor} ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Status')}</label>
                <p className="text-lg font-semibold text-blue-600">{lead.status || 'Active'}</p>
              </div>
              <div>
                <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Priority')}</label>
                <p className="text-lg">{lead.priority || 'Medium'}</p>
              </div>
              <div>
                <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Source')}</label>
                <p className="text-lg">{lead.source || 'Direct'}</p>
              </div>
              <div>
                <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Campaign')}</label>
                <p className="text-lg">{lead.campaign || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Comments/Notes */}
          {(lead.lastComment || lead.notes || lead.comment) && (
            <div className={`p-4 rounded-lg border ${borderColor} ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
              <div className="flex items-start gap-3">
                <FaComments className={`${secondaryTextColor} mt-1`} size={16} />
                <div className="flex-1">
                  <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Notes')}</label>
                  <p className="text-base mt-1 leading-relaxed">
                    {lead.lastComment || lead.notes || lead.comment}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Additional Information */}
          <div className={`p-4 rounded-lg border ${borderColor} ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
            <h3 className="text-lg font-semibold mb-3">{t('Additional Information')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Assigned To')}</label>
                <p className="text-base">
                  {(() => {
                    const s = String(lead.stage || '').toLowerCase();
                    const isNew = s.includes('new') || s.includes('جديد') || s.includes('نيوليد');
                    return isNew ? '-' : (lead.assignedTo || 'N/A');
                  })()}
                </p>
              </div>
              <div>
                <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Created By')}</label>
                <p className="text-base">{lead.creator?.name || lead.createdBy || 'N/A'}</p>
              </div>
              <div>
                <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Estimated Value')}</label>
                <p className="text-base">{lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : 'N/A'}</p>
              </div>
              <div>
                <label className={`text-sm font-medium ${secondaryTextColor}`}>{t('Probability')}</label>
                <p className="text-base">{lead.probability !== undefined ? `${lead.probability}%` : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Actions & Activities Section */}
          <div className={`p-4 rounded-lg border ${borderColor} ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FaComments className="text-blue-600" />
                {t('Recent Activities')}
              </h3>
              <div className="flex gap-2">
                {canOpenAddAction && (
                  <button
                    onClick={() => setShowAddActionModal(true)}
                    className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('Add Action')}
                  </button>
                )}
                <button
                  onClick={handleViewDetails}
                  className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none flex items-center gap-1"
                >
                  <FaEye size={12} />
                  {t('View All')}
                </button>
              </div>
            </div>
            
            {/* Sample Recent Actions */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <FaPhone className="text-blue-600 dark:text-blue-400" size={14} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{t('Phone Call')}</span>
                    <span className={`text-xs ${secondaryTextColor}`}>2024-01-20</span>
                  </div>
                  <p className={`text-sm mt-1 ${secondaryTextColor}`}>
                    {t('Follow-up call completed. Client interested in proposal.')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <FaEnvelope className="text-green-600 dark:text-green-400" size={14} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{t('Email Sent')}</span>
                    <span className={`text-xs ${secondaryTextColor}`}>2024-01-18</span>
                  </div>
                  <p className={`text-sm mt-1 ${secondaryTextColor}`}>
                    {t('Proposal document sent to client for review.')}
                  </p>
                </div>
              </div>
              
              <div className="text-center py-2">
                <button
                  onClick={handleViewDetails}
                  className={`text-sm ${secondaryTextColor} hover:text-blue-600 transition-colors`}
                >
                  {t('View all activities')} →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${borderColor}`}>
          <button
            onClick={onClose}
            className="btn btn-sm bg-red-600 hover:bg-red-700 text-white border-none"
          >
            {t('Close')}
          </button>
          {canOpenEditLead && (
            <button
              className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-none"
            onClick={() => {
              // يمكن إضافة منطق تحرير العميل المحتمل هنا
              setShowEditModal(true);
            }}
          >
            {t('Edit Lead')}
          </button>
          )}
        </div>
      </div>

      {/* Edit Lead Modal */}
      <EditLeadModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditLead}
        lead={lead}
        canEditInfo={leadPermissionFlags.canEditInfo}
        canEditPhone={leadPermissionFlags.canEditPhone}
      />

      {/* Lead Details Modal */}
      <LeadDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        lead={lead}
      />

      {/* Add Action Modal */}
      <AddActionModal
        isOpen={showAddActionModal && canOpenAddAction}
        onClose={() => setShowAddActionModal(false)}
        onSave={handleAddAction}
        lead={lead}
      />
    </div>
  );
};

export default LeadModal;
