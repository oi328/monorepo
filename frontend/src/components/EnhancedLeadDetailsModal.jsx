import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPhone, FaEnvelope, FaUser, FaHistory, FaHandshake, FaFileAlt, FaComments, FaTimes, FaInfoCircle, FaChartLine, FaPlus, FaCalendarAlt, FaClock, FaEdit, FaTrash, FaWhatsapp, FaVideo } from 'react-icons/fa';

const EnhancedLeadDetailsModal = ({ isOpen, onClose, lead }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const [activeTab, setActiveTab] = useState('details');
  const [actionFilter, setActionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([
    {
      id: 1,
      text: isArabic ? 'العميل مهتم جداً بالمشروع ويريد البدء في أقرب وقت ممكن' : 'Client is very interested in the project and wants to start as soon as possible',
      author: isArabic ? 'أحمد علي' : 'Ahmed Ali',
      date: '2024-01-15',
      time: '10:30 AM'
    },
    {
      id: 2,
      text: isArabic ? 'تم إرسال العرض المالي وننتظر الرد خلال أسبوع' : 'Financial proposal sent, waiting for response within a week',
      author: isArabic ? 'سارة محمد' : 'Sara Mohamed',
      date: '2024-01-16',
      time: '2:15 PM'
    },
    {
      id: 3,
      text: isArabic ? 'العميل طلب تعديلات على العرض، سيتم إرسال النسخة المحدثة غداً' : 'Client requested modifications to the proposal, updated version will be sent tomorrow',
      author: isArabic ? 'عمر حسن' : 'Omar Hassan',
      date: '2024-01-18',
      time: '11:00 AM'
    }
  ]);

  if (!isOpen || !lead) return null;

  // Handle adding new comment
  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: comments.length + 1,
        text: newComment,
        author: isArabic ? 'المستخدم الحالي' : 'Current User',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setComments([...comments, comment]);
      setNewComment('');
    }
  };

  // Sample actions data
  const leadActions = [
    {
      id: 1,
      type: 'call',
      title: isArabic ? 'مكالمة هاتفية مع العميل' : 'Phone call with client',
      description: isArabic ? 'مكالمة هاتفية مع العميل' : 'Phone call with client',
      date: '2024-01-15',
      time: '10:30 AM',
      user: isArabic ? 'أحمد علي' : 'Ahmed Ali',
      status: 'completed',
      priority: 'high',
      notes: isArabic ? 'تم مناقشة متطلبات المشروع والميزانية المتاحة' : 'Discussed project requirements and available budget'
    },
    {
      id: 2,
      type: 'email',
      title: isArabic ? 'إرسال عرض سعر' : 'Send quotation',
      description: isArabic ? 'إرسال عرض سعر' : 'Send quotation',
      date: '2024-01-16',
      time: '2:15 PM',
      user: isArabic ? 'سارة محمد' : 'Sara Mohamed',
      status: 'completed',
      priority: 'medium',
      notes: isArabic ? 'تم إرسال عرض سعر مفصل للمشروع' : 'Sent detailed project quotation'
    },
    {
      id: 3,
      type: 'meeting',
      title: isArabic ? 'اجتماع في المكتب' : 'Office meeting',
      description: isArabic ? 'اجتماع في المكتب' : 'Office meeting',
      date: '2024-01-18',
      time: '11:00 AM',
      user: isArabic ? 'عمر حسن' : 'Omar Hassan',
      status: 'completed',
      priority: 'high',
      notes: isArabic ? 'اجتماع لمناقشة التفاصيل الفنية للمشروع' : 'Meeting to discuss technical project details'
    },
    {
      id: 4,
      type: 'follow_up',
      title: isArabic ? 'متابعة العرض' : 'Follow up on proposal',
      description: isArabic ? 'متابعة العرض' : 'Follow up on proposal',
      date: '2024-01-20',
      time: '9:45 AM',
      user: isArabic ? 'فاطمة إبراهيم' : 'Fatima Ibrahim',
      status: 'pending',
      priority: 'medium',
      notes: isArabic ? 'متابعة رد العميل على العرض المقدم' : 'Follow up on client response to submitted proposal'
    },
    {
      id: 5,
      type: 'proposal',
      title: isArabic ? 'تحضير عرض فني' : 'Prepare technical proposal',
      description: isArabic ? 'تحضير عرض فني' : 'Prepare technical proposal',
      date: '2024-01-22',
      time: '3:30 PM',
      user: isArabic ? 'محمد أحمد' : 'Mohamed Ahmed',
      status: 'in_progress',
      priority: 'high',
      notes: isArabic ? 'إعداد عرض فني شامل للمشروع' : 'Preparing comprehensive technical proposal'
    },
    {
      id: 6,
      type: 'document',
      title: isArabic ? 'مراجعة المستندات' : 'Document review',
      description: isArabic ? 'مراجعة المستندات' : 'Document review',
      date: '2024-01-24',
      time: '1:15 PM',
      user: isArabic ? 'ليلى حسام' : 'Layla Hossam',
      status: 'pending',
      priority: 'low',
      notes: isArabic ? 'مراجعة المستندات المطلوبة للمشروع' : 'Review required project documents'
    }
  ];

  const getActionIcon = (type) => {
    switch (type) {
      case 'call': return <FaPhone className="text-blue-500" />;
      case 'email': return <FaEnvelope className="text-green-500" />;
      case 'meeting': return <FaUser className="text-purple-500" />;
      case 'follow_up': return <FaHistory className="text-orange-500" />;
      case 'proposal': return <FaHandshake className="text-indigo-500" />;
      case 'document': return <FaFileAlt className="text-gray-500" />;
      default: return <FaComments className="text-gray-500" />;
    }
  };

  const getActionTypeLabel = (type) => {
    if (isArabic) {
      switch (type) {
        case 'call': return 'مكالمة';
        case 'email': return 'بريد إلكتروني';
        case 'meeting': return 'اجتماع';
        case 'follow_up': return 'متابعة';
        case 'proposal': return 'عرض سعر';
        case 'document': return 'مستند';
        default: return 'أخرى';
      }
    } else {
      switch (type) {
        case 'call': return 'Call';
        case 'email': return 'Email';
        case 'meeting': return 'Meeting';
        case 'follow_up': return 'Follow Up';
        case 'proposal': return 'Proposal';
        case 'document': return 'Document';
        default: return 'Other';
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    if (isArabic) {
      switch (status) {
        case 'completed': return 'مكتمل';
        case 'in_progress': return 'قيد التنفيذ';
        case 'pending': return 'معلق';
        case 'cancelled': return 'ملغي';
        default: return 'غير محدد';
      }
    } else {
      switch (status) {
        case 'completed': return 'Completed';
        case 'in_progress': return 'In Progress';
        case 'pending': return 'Pending';
        case 'cancelled': return 'Cancelled';
        default: return 'Unknown';
      }
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority) => {
    if (isArabic) {
      switch (priority) {
        case 'high': return 'عالية';
        case 'medium': return 'متوسطة';
        case 'low': return 'منخفضة';
        default: return 'غير محدد';
      }
    } else {
      switch (priority) {
        case 'high': return 'High';
        case 'medium': return 'Medium';
        case 'low': return 'Low';
        default: return 'Unknown';
      }
    }
  };

  // Filter and sort actions
  const filteredAndSortedActions = leadActions
    .filter(action => {
      if (actionFilter === 'all') return true;
      return action.type === actionFilter;
    })
    .filter(action => {
      if (!searchTerm) return true;
      return action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             action.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
             action.user.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date) - new Date(a.date);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[85vh] flex flex-col transform transition-all duration-300 ease-out overflow-hidden max-w-[100vw]">
        {/* Modern Header with Gradient */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-2 sm:p-8 flex-shrink-0 overflow-hidden">
          <button 
            onClick={onClose}
            className={`absolute top-3 z-[60] bg-white text-red-600 hover:bg-red-50 shadow-lg rounded-full flex items-center justify-center border-none ${isArabic ? 'left-3' : 'right-3'} sm:top-4 sm:right-4 sm:rtl:right-auto sm:rtl:left-4 w-7 h-7 sm:w-8 sm:h-8 transition-transform active:scale-95`}
            aria-label={isArabic ? 'إغلاق' : 'Close'}
          >
            <FaTimes size={14} className="sm:text-[18px]" />
          </button>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 rtl:space-x-reverse">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-8 h-8 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                  <FaUser className="text-white text-sm sm:text-2xl" />
                </div>
                <div className="flex-1 sm:hidden">
                    <h2 className="text-sm font-bold text-white mb-0.5 line-clamp-1">
                      {lead.fullName || lead.leadName || lead.name}
                    </h2>
                    <p className="text-blue-100 text-[9px] font-medium">
                      {isArabic ? 'تفاصيل العميل المحتمل' : 'Lead Details'}
                    </p>
                </div>
              </div>
              <div className="flex-1 hidden sm:block">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {lead.fullName || lead.leadName || lead.name}
                </h2>
                <p className="text-blue-100 text-sm font-medium">
                  {isArabic ? 'تفاصيل العميل المحتمل' : 'Lead Details'}
                </p>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse overflow-x-auto pb-0 sm:pb-0 scrollbar-hide">
                <div className="bg-white/20 backdrop-blur-sm rounded sm:rounded-xl px-1.5 py-0.5 sm:px-4 sm:py-2 whitespace-nowrap">
                  <span className="text-white text-[9px] sm:text-sm font-medium">
                    {lead.stage || (isArabic ? 'جديد' : 'New')}
                  </span>
                </div>
                <div className="bg-green-500/20 backdrop-blur-sm rounded sm:rounded-xl px-1.5 py-0.5 sm:px-4 sm:py-2 whitespace-nowrap">
                  <span className="text-green-100 text-[9px] sm:text-sm font-medium">
                    {lead.status || (isArabic ? 'نشط' : 'Active')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12 pointer-events-none"></div>
        </div>

        {/* Modern Tabs */}
        <div className="bg-gray-50/50 px-2 sm:px-8 pt-2 sm:pt-6 flex-shrink-0">
          <div className="grid grid-cols-4 sm:flex sm:space-x-1 rtl:space-x-reverse bg-gray-100 rounded-xl sm:rounded-2xl p-1 gap-1 sm:gap-0">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex flex-col sm:flex-row items-center justify-center py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 text-[10px] sm:text-base ${
                activeTab === 'details'
                  ? 'bg-white text-blue-600 shadow-sm sm:shadow-lg shadow-blue-500/20 transform scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <FaUser className="text-sm sm:text-sm mb-1 sm:mb-0 sm:mr-2 rtl:sm:mr-0 rtl:sm:ml-2" />
              <span>{isArabic ? 'التفاصيل' : 'Details'}</span>
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`flex flex-col sm:flex-row items-center justify-center py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 text-[10px] sm:text-base relative ${
                activeTab === 'actions'
                  ? 'bg-white text-blue-600 shadow-sm sm:shadow-lg shadow-blue-500/20 transform scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <FaHistory className="text-sm sm:text-sm mb-1 sm:mb-0 sm:mr-2 rtl:sm:mr-0 rtl:sm:ml-2" />
              <span>{isArabic ? `الأنشطة` : `Activities`}</span>
              <div className="absolute top-0 right-0 sm:static bg-blue-100 text-blue-600 text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full -mt-1 -mr-1 sm:mt-0 sm:mr-0 sm:ml-1 rtl:sm:ml-0 rtl:sm:mr-1">
                {filteredAndSortedActions.length}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`flex flex-col sm:flex-row items-center justify-center py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 text-[10px] sm:text-base relative ${
                activeTab === 'comments'
                  ? 'bg-white text-blue-600 shadow-sm sm:shadow-lg shadow-blue-500/20 transform scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <FaComments className="text-sm sm:text-sm mb-1 sm:mb-0 sm:mr-2 rtl:sm:mr-0 rtl:sm:ml-2" />
              <span>{isArabic ? 'التعليقات' : 'Comments'}</span>
              <div className="absolute top-0 right-0 sm:static bg-blue-100 text-blue-600 text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full -mt-1 -mr-1 sm:mt-0 sm:mr-0 sm:ml-1 rtl:sm:ml-0 rtl:sm:mr-1">
                {comments.length}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('communication')}
              className={`flex flex-col sm:flex-row items-center justify-center py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 text-[10px] sm:text-base ${
                activeTab === 'communication'
                  ? 'bg-white text-blue-600 shadow-sm sm:shadow-lg shadow-blue-500/20 transform scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <FaInfoCircle className="text-sm sm:text-sm mb-1 sm:mb-0 sm:mr-2 rtl:sm:mr-0 rtl:sm:ml-2" />
              <span>{isArabic ? 'التواصل' : 'Contact'}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1">
          {activeTab === 'details' && (
            <div className="space-y-8">
              {/* Basic Information */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <div className="bg-blue-500 p-2 rounded-xl mr-3">
                    <FaUser className="text-white text-sm" />
                  </div>
                  {isArabic ? 'المعلومات الأساسية' : 'Basic Information'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'الاسم الكامل' : 'Full Name'}</label>
                    <p className="text-gray-800 font-semibold text-lg">{lead.fullName || lead.leadName || lead.name || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <p className="text-gray-800 font-medium">{lead.mobile || lead.phone || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
                    <p className="text-gray-800 font-medium">{lead.email || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'الشركة' : 'Company'}</label>
                    <p className="text-gray-800 font-medium">{lead.company || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'الموقع' : 'Location'}</label>
                    <p className="text-gray-800 font-medium">{lead.location || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'تاريخ المرحلة' : 'Stage Date'}</label>
                    <p className="text-gray-800 font-medium">{lead.stageDate || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                </div>
              </div>

              {/* Status Information */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <div className="bg-purple-500 p-2 rounded-xl mr-3">
                    <FaChartLine className="text-white text-sm" />
                  </div>
                  {isArabic ? 'معلومات الحالة' : 'Status Information'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-3">{isArabic ? 'الحالة' : 'Status'}</label>
                    <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${
                      lead.status === 'New' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      lead.status === 'Contacted' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                      lead.status === 'Qualified' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        lead.status === 'New' ? 'bg-emerald-500' :
                        lead.status === 'Contacted' ? 'bg-blue-500' :
                        lead.status === 'Qualified' ? 'bg-amber-500' :
                        'bg-gray-500'
                      }`}></div>
                      {lead.status || (isArabic ? 'غير محدد' : 'Not specified')}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-3">{isArabic ? 'الأولوية' : 'Priority'}</label>
                    <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold shadow-sm ${
                      lead.priority === 'High' ? 'bg-red-100 text-red-700 border border-red-200' :
                      lead.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                      lead.priority === 'Low' ? 'bg-green-100 text-green-700 border border-green-200' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        lead.priority === 'High' ? 'bg-red-500' :
                        lead.priority === 'Medium' ? 'bg-yellow-500' :
                        lead.priority === 'Low' ? 'bg-green-500' :
                        'bg-gray-500'
                      }`}></div>
                      {lead.priority || (isArabic ? 'غير محدد' : 'Not specified')}
                    </span>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-3">{isArabic ? 'المصدر' : 'Source'}</label>
                    <p className="text-gray-800 font-medium">{lead.source || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <div className="bg-emerald-500 p-2 rounded-xl mr-3">
                    <FaInfoCircle className="text-white text-sm" />
                  </div>
                  {isArabic ? 'معلومات إضافية' : 'Additional Information'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'مُعيَّن إلى' : 'Assigned To'}</label>
                    <p className="text-gray-800 font-medium">
                      {(() => {
                        const s = String(lead.stage || '').toLowerCase();
                        const isNew = s.includes('new') || s.includes('جديد') || s.includes('نيوليد');
                        return isNew ? '-' : (lead.assignedTo || (isArabic ? 'غير مُعيَّن' : 'Not assigned'));
                      })()}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'القيمة المقدرة' : 'Estimated Value'}</label>
                    <p className="text-gray-800 font-semibold text-lg text-emerald-600">{lead.estimatedValue ? `$${lead.estimatedValue}` : (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'الاحتمالية' : 'Probability'}</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                          style={{width: `${lead.probability || 0}%`}}
                        ></div>
                      </div>
                      <span className="text-gray-800 font-semibold">{lead.probability ? `${lead.probability}%` : '0%'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {lead.notes && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <div className="bg-amber-500 p-2 rounded-xl mr-3">
                      <FaComments className="text-white text-sm" />
                    </div>
                    {isArabic ? 'الملاحظات' : 'Notes'}
                  </h3>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-gray-700 leading-relaxed">{lead.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-6">
              {/* Header with Add Button */}
              <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-blue-100">
                <div className="flex items-center">
                  <div className="bg-blue-500 p-2 sm:p-3 rounded-xl mr-3 sm:mr-4">
                    <FaHistory className="text-white text-base sm:text-lg" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{isArabic ? 'سجل الأنشطة والأكشنز' : 'Actions & Activities Log'}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm mt-1">{isArabic ? 'تتبع جميع التفاعلات مع العميل' : 'Track all client interactions'}</p>
                  </div>
                </div>
                <button className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none gap-2 px-2 sm:px-4">
                  <FaPlus size={14} />
                  <span className="hidden sm:inline">{isArabic ? 'إضافة نشاط جديد' : 'Add New Activity'}</span>
                </button>
              </div>

              {/* Actions List */}
              <div className="space-y-4">
                {filteredAndSortedActions.map((action, index) => (
                  <div key={action.id} className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300 hover:border-blue-200 group">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-0">
                      <div className="flex items-start space-x-4 rtl:space-x-reverse flex-1">
                        <div className="flex-shrink-0">
                          <div className={`p-3 rounded-xl ${
                            action.type === 'call' ? 'bg-green-100 text-green-600' :
                            action.type === 'email' ? 'bg-blue-100 text-blue-600' :
                            action.type === 'meeting' ? 'bg-purple-100 text-purple-600' :
                            action.type === 'note' ? 'bg-amber-100 text-amber-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {getActionIcon(action.type)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <h4 className="font-semibold text-gray-800 text-base sm:text-lg">{action.description}</h4>
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                              action.type === 'call' ? 'bg-green-100 text-green-700' :
                              action.type === 'email' ? 'bg-blue-100 text-blue-700' :
                              action.type === 'meeting' ? 'bg-purple-100 text-purple-700' :
                              action.type === 'note' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {getActionTypeLabel(action.type)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center text-xs sm:text-sm text-gray-500 mb-3 gap-3 sm:gap-4">
                            <span className="flex items-center space-x-1 rtl:space-x-reverse">
                              <FaCalendarAlt size={12} />
                              <span>{action.date}</span>
                            </span>
                            <span className="flex items-center space-x-1 rtl:space-x-reverse">
                              <FaClock size={12} />
                              <span>{action.time}</span>
                            </span>
                            <span className="flex items-center space-x-1 rtl:space-x-reverse">
                              <FaUser size={12} />
                              <span>{action.user}</span>
                            </span>
                          </div>
                          {action.notes && (
                            <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-100">
                              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{action.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                        <button className="btn btn-sm btn-circle bg-blue-600 hover:bg-blue-700 text-white border-none" title={isArabic ? 'تحرير' : 'Edit'}>
                          <FaEdit size={14} />
                        </button>
                        <button className="btn btn-sm btn-circle bg-red-600 hover:bg-red-700 text-white border-none" title={isArabic ? 'حذف' : 'Delete'}>
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {leadActions.length === 0 && (
                <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                  <div className="bg-gray-200 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <FaHistory size={32} className="text-gray-400" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-600 mb-2">{isArabic ? 'لا توجد أنشطة' : 'No Activities'}</h4>
                  <p className="text-gray-500">{isArabic ? 'لا توجد أنشطة مسجلة لهذا العميل المحتمل' : 'No activities recorded for this lead'}</p>
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-white min-h-[400px]">
              <div className="mb-6">
                {/* Modern Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 sm:p-6 rounded-xl shadow-lg mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2 flex items-center">
                    <div className="bg-white/20 p-2 rounded-lg ml-3">
                      <FaComments className="text-white" size={20} />
                    </div>
                    {isArabic ? 'التعليقات والملاحظات' : 'Comments & Notes'}
                  </h3>
                  <p className="text-purple-100 text-xs sm:text-sm">
                    {isArabic ? 'تتبع جميع التعليقات والملاحظات المهمة' : 'Track all important comments and notes'}
                  </p>
                </div>
                
                {/* Add New Comment */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 sm:p-6 rounded-xl border border-blue-200 shadow-sm mb-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg ml-3">
                      <FaPlus className="text-white" size={16} />
                    </div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">
                      {isArabic ? 'إضافة تعليق جديد' : 'Add New Comment'}
                    </h4>
                  </div>
                  <div className="space-y-4">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={isArabic ? 'اكتب تعليقك هنا...' : 'Write your comment here...'}
                      className="w-full p-4 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 bg-white/80 backdrop-blur-sm text-sm"
                      rows="4"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-none gap-2 w-full sm:w-auto"
                      >
                        <FaPlus size={14} />
                        {isArabic ? 'إضافة تعليق' : 'Add Comment'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-gradient-to-r from-green-500 to-teal-500 p-2 rounded-lg ml-3">
                        <FaHistory className="text-white" size={16} />
                      </div>
                      <h4 className="font-semibold text-gray-800 text-sm sm:text-base">
                        {isArabic ? 'سجل التعليقات' : 'Comments History'}
                      </h4>
                    </div>
                    <div className="bg-gradient-to-r from-green-100 to-teal-100 px-3 py-1 rounded-full">
                      <span className="text-green-700 font-medium text-xs sm:text-sm">{comments.length} {isArabic ? 'تعليق' : 'comments'}</span>
                    </div>
                  </div>
                  
                  {comments.length > 0 ? (
                    <div className="space-y-4">
                      {comments.map((comment, index) => (
                        <div key={comment.id} className="bg-white border-2 border-gray-100 rounded-xl p-4 sm:p-5 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-3 space-x-reverse">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                                <FaUser className="text-white" size={16} />
                              </div>
                              <div>
                                <span className="font-semibold text-gray-800 text-base sm:text-lg">{comment.author}</span>
                                <div className="flex items-center text-xs sm:text-sm text-gray-500 mt-1">
                                  <FaClock className="ml-1" size={12} />
                                  {comment.date} {isArabic ? 'في' : 'at'} {comment.time}
                                </div>
                              </div>
                            </div>
                            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-2 sm:px-3 py-1 rounded-full">
                              <span className="text-gray-600 text-[10px] sm:text-xs font-medium">#{index + 1}</span>
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-500">
                            <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{comment.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-dashed border-gray-300">
                      <div className="bg-gradient-to-r from-gray-400 to-blue-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaComments size={24} className="text-white" />
                      </div>
                      <h4 className="text-lg font-medium text-gray-600 mb-2">{isArabic ? 'لا توجد تعليقات' : 'No Comments'}</h4>
                      <p className="text-gray-500">{isArabic ? 'لا توجد تعليقات لهذا العميل المحتمل' : 'No comments for this lead'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'communication' && (
            <div className="p-4 sm:p-8 space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-blue-100 shadow-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <div className="bg-blue-500 p-2 rounded-xl mr-3">
                    <FaComments className="text-white text-sm" />
                  </div>
                  {isArabic ? 'التواصل' : 'Communication'}
                </h3>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <button 
                  onClick={() => window.open(`https://wa.me/${lead?.phone}`, '_blank')}
                  className="flex flex-col items-center justify-center p-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <FaWhatsapp className="text-2xl mb-2" />
                  <span className="text-sm font-medium">{isArabic ? 'واتساب' : 'WhatsApp'}</span>
                </button>
                <button 
                  onClick={() => window.open(`mailto:${lead?.email}`, '_blank')}
                  className="flex flex-col items-center justify-center p-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <FaEnvelope className="text-2xl mb-2" />
                  <span className="text-sm font-medium">{isArabic ? 'بريد إلكتروني' : 'Email'}</span>
                </button>
                <button 
                  onClick={() => window.open(`tel:${lead?.phone}`, '_blank')}
                  className="flex flex-col items-center justify-center p-4 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <FaPhone className="text-2xl mb-2" />
                  <span className="text-sm font-medium">{isArabic ? 'مكالمة' : 'Call'}</span>
                </button>
                <button 
                  onClick={() => alert(isArabic ? 'سيتم فتح تطبيق الفيديو قريباً' : 'Video app will open soon')}
                  className="flex flex-col items-center justify-center p-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <FaVideo className="text-2xl mb-2" />
                  <span className="text-sm font-medium">{isArabic ? 'مؤتمر فيديو' : 'Video Call'}</span>
                </button>
              </div>

              {/* Communication Feed Placeholder */}
               <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-gray-500">{isArabic ? 'سجل التواصل سيظهر هنا' : 'Communication feed will appear here'}</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedLeadDetailsModal;
