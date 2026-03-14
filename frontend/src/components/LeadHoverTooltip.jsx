import { FaEye, FaPhone, FaWhatsapp, FaEnvelope, FaVideo, FaTrash, FaUserPlus, FaExchangeAlt } from 'react-icons/fa'

const LeadHoverTooltip = ({ lead, position, onAction, isRtl, onMouseEnter, onMouseLeave, innerRef, getStageStyle, getPriorityColor, allowConvertToCustomer, showMobileNumberAllowed }) => {
  const isDuplicate = String(lead?.stage || lead?.status || '').toLowerCase().includes('duplicate');
  const allowMobile = showMobileNumberAllowed !== false;
  const allowConvert = allowConvertToCustomer !== false;

  const nonDuplicateBaseActions = [
    { id: 'view', icon: FaEye, label: isRtl ? 'عرض' : 'View', color: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20' },
    ...(allowMobile ? [
      { id: 'call', icon: FaPhone, label: isRtl ? 'اتصال' : 'Call', color: 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' },
      { id: 'whatsapp', icon: FaWhatsapp, label: isRtl ? 'واتساب' : 'WhatsApp', color: 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' },
    ] : []),
    { id: 'email', icon: FaEnvelope, label: isRtl ? 'إيميل' : 'Email', color: 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20' },
    { id: 'video', icon: FaVideo, label: isRtl ? 'فيديو' : 'Video', color: 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' },
    ...(allowConvert ? [
      { id: 'convert', icon: FaUserPlus, label: isRtl ? 'تحويل لعميل' : 'Convert', color: 'text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20' },
    ] : []),
    { id: 'delete', icon: FaTrash, label: isRtl ? 'حذف' : 'Delete', color: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' },
  ];

  const duplicateBaseActions = [
    { id: 'compare', icon: FaExchangeAlt, label: isRtl ? 'مقارنة' : 'Compare', color: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' },
    ...(allowMobile ? [
      { id: 'call', icon: FaPhone, label: isRtl ? 'اتصال' : 'Call', color: 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' },
      { id: 'whatsapp', icon: FaWhatsapp, label: isRtl ? 'واتساب' : 'WhatsApp', color: 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' },
    ] : []),
    { id: 'email', icon: FaEnvelope, label: isRtl ? 'إيميل' : 'Email', color: 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20' },
    { id: 'video', icon: FaVideo, label: isRtl ? 'فيديو' : 'Video', color: 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' },
    { id: 'delete', icon: FaTrash, label: isRtl ? 'حذف' : 'Delete', color: 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' },
  ];

  const actions = isDuplicate ? duplicateBaseActions : nonDuplicateBaseActions;

  return (
    // Outer container: position the tooltip, but do not capture pointer events
    <div
      className="fixed z-[9999]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    >
      {/* Inner interactive container: captures hover and click events */}
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 p-3 min-w-[220px] max-w-[280px]"
        style={{ pointerEvents: 'auto' }}
        ref={innerRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Lead Info Header */}
        <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-600 mb-3">
          <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {lead?.name || lead?.leadName || ''}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {lead?.email || (allowMobile ? (lead?.phone || lead?.mobile || '') : '')}
          </div>
          
          <div className="flex flex-wrap gap-1 mt-2">
            {/* Stage Badge */}
            {getStageStyle && (() => {
              const { style, className } = getStageStyle(lead?.stage);
              return (
                <span className={`${className} px-1.5 py-0.5 text-[10px] rounded-full font-medium truncate max-w-[80px]`} style={style}>
                  {lead?.stage || 'N/A'}
                </span>
              );
            })()}

            {/* Priority Badge */}
            {getPriorityColor && (
              <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-medium border ${getPriorityColor(lead?.priority)}`}>
                {lead?.priority || 'N/A'}
              </span>
            )}

            {/* Sales Person Badge */}
            <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded-full font-medium truncate max-w-[80px]">
              {lead?.sales_person || (typeof lead?.assignedTo === 'string' ? lead.assignedTo : lead?.assignedTo?.name) || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Action Icons */}
        <div className="grid grid-cols-3 gap-2">
          {actions.map((action) => {
            const IconComponent = action.icon
            return (
              <button
                key={action.id}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onAction(action.id)
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 ${action.color} hover:scale-105 hover:shadow-md cursor-pointer`}
                title={action.label}
              >
                <IconComponent className="w-4 h-4 mb-1" />
                <span className="text-xs font-medium">{action.label}</span>
              </button>
            )
          })}
        </div>

        {/* Arrow pointing to the cursor */}
        <div 
          className="absolute w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white dark:border-t-gray-800"
          style={{
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        />
      </div>
    </div>
  )
}

export default LeadHoverTooltip
