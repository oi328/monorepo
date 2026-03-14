import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FaUser, 
  FaTimes, 
  FaPaperclip, 
  FaDownload, 
  FaComments, 
  FaFilePdf, 
  FaFileImage, 
  FaMapMarkerAlt, 
  FaFileAlt 
} from 'react-icons/fa';

const CustomerDetailsModal = ({ isOpen, onClose, customer, initialTab = 'details' }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showAttachments, setShowAttachments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([
    {
      id: 1,
      text: isArabic ? 'عميل مهم، يطلب منتجات بكميات كبيرة' : 'VIP Customer, requests products in bulk',
      author: isArabic ? 'أحمد علي' : 'Ahmed Ali',
      date: '2024-01-15',
      time: '10:30 AM'
    }
  ]);

  if (!isOpen || !customer) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-0 sm:p-4 backdrop-blur-sm">
      {/* 
         Updated classes:
         - Added 'flex flex-col' to enable flex layout for children (header, tabs, content)
         - Added 'overflow-hidden' to prevent scroll on the modal container itself
         - Removed 'overflow-y-auto' from here to have single scrollbar in content
         - Removed 'h-auto' to rely on max-h and flex
      */}
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl max-h-[85vh] flex flex-col overflow-hidden transform transition-all duration-300 ease-out">
        {/* Modern Header with Gradient */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8 flex-shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 btn btn-sm btn-circle bg-white text-red-600 hover:bg-red-50 shadow-lg rtl:right-auto rtl:left-4"
          >
            <FaTimes size={18} />
          </button>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FaUser className="text-white text-2xl" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {customer.name}
                </h2>
                <p className="text-blue-100 text-sm font-medium">
                  {isArabic ? 'تفاصيل العميل' : 'Customer Details'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => setShowAttachments(true)}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-2 shadow-lg flex items-center gap-2 backdrop-blur-sm transition-colors h-auto"
                >
                  <FaPaperclip size={14} />
                  <span className="hidden sm:inline text-sm font-medium">{isArabic ? 'المرفقات' : 'Attachments'}</span>
                </button>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                  <span className="text-white text-sm font-medium">
                    {customer.type}
                  </span>
                </div>
                <div className="bg-green-500/20 backdrop-blur-sm rounded-xl px-4 py-2">
                  <span className="text-green-100 text-sm font-medium">
                    {customer.source}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
        </div>

        {/* Modern Tabs */}
        <div className="bg-gray-50/50 px-8 pt-6 flex-shrink-0">
          <div className="flex space-x-1 rtl:space-x-reverse bg-gray-100 rounded-2xl p-1.5">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 rtl:space-x-reverse ${
                activeTab === 'details'
                  ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/20 transform scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <FaUser className="text-sm" />
              <span>{isArabic ? 'تفاصيل العميل' : 'Client Details'}</span>
            </button>
            {/* Removed Activities Tab */}
            <button
              onClick={() => setActiveTab('comments')}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 rtl:space-x-reverse ${
                activeTab === 'comments'
                  ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/20 transform scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
              }`}
            >
              <FaComments className="text-sm" />
              <span>{isArabic ? 'التعليقات' : 'Comments'}</span>
              <div className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full ml-2 rtl:ml-0 rtl:mr-2">
                {comments.length}
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        {/* 
            Updated classes:
            - Added 'flex-1' to take remaining height
            - Added 'overflow-y-auto' to enable scrolling only in this area
            - Removed fixed max-h calculation
        */}
        <div className="p-8 overflow-y-auto flex-1 relative">
           {/* Attachments Overlay */}
          {showAttachments && (
            <div className="absolute inset-0 z-[50] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <FaPaperclip className="text-blue-500" />
                      {isArabic ? 'المرفقات' : 'Attachments'}
                    </h3>
                    <button onClick={() => setShowAttachments(false)} className="text-gray-400 hover:text-gray-600">
                      <FaTimes />
                    </button>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Mock Attachments */}
                     <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 text-red-500 rounded-lg flex items-center justify-center">
                            <FaFilePdf size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-sm">Contract.pdf</p>
                            <p className="text-xs text-gray-500">2.4 MB • 12 Jan 2024</p>
                          </div>
                        </div>
                        <button className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <FaDownload />
                        </button>
                     </div>
                     <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-blue-50 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-lg flex items-center justify-center">
                            <FaFileImage size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 text-sm">ID_Card.jpg</p>
                            <p className="text-xs text-gray-500">1.8 MB • 10 Jan 2024</p>
                          </div>
                        </div>
                         <button className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <FaDownload />
                        </button>
                     </div>
                  </div>
                  <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    <button 
                      onClick={() => setShowAttachments(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      {isArabic ? 'إغلاق' : 'Close'}
                    </button>
                  </div>
               </div>
            </div>
          )}

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
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'كود العميل' : 'Customer Code'}</label>
                    <p className="text-gray-800 font-semibold text-lg">{customer.customerCode || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'الاسم الكامل' : 'Full Name'}</label>
                    <p className="text-gray-800 font-semibold text-lg">{customer.name || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <p className="text-gray-800 font-medium">{customer.phone || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
                    <p className="text-gray-800 font-medium">{customer.email || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'الشركة' : 'Company'}</label>
                    <p className="text-gray-800 font-medium">{customer.companyName || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                   <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'الرقم الضريبي' : 'Tax Number'}</label>
                    <p className="text-gray-800 font-medium">{customer.taxNumber || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                   <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'مسؤول المبيعات' : 'Sales Rep'}</label>
                    <p className="text-gray-800 font-medium">{customer.assignedSalesRep || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <div className="bg-purple-500 p-2 rounded-xl mr-3">
                    <FaMapMarkerAlt className="text-white text-sm" />
                  </div>
                  {isArabic ? 'العنوان' : 'Address'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'الدولة' : 'Country'}</label>
                    <p className="text-gray-800 font-medium">{customer.country || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                   <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'المدينة' : 'City'}</label>
                    <p className="text-gray-800 font-medium">{customer.city || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                   <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'العنوان' : 'Address Line'}</label>
                    <p className="text-gray-800 font-medium">{customer.addressLine || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                </div>
              </div>
              
              {/* Notes */}
               <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <div className="bg-yellow-500 p-2 rounded-xl mr-3">
                    <FaFileAlt className="text-white text-sm" />
                  </div>
                  {isArabic ? 'الملاحظات' : 'Notes'}
                </h3>
                 <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-gray-800 font-medium whitespace-pre-wrap">{customer.notes || (isArabic ? 'لا توجد ملاحظات' : 'No notes')}</p>
                  </div>
              </div>

            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-6">
               <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newComment} 
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 border rounded-lg px-4 py-2 text-black"
                    placeholder={isArabic ? 'أضف تعليق...' : 'Add a comment...'}
                  />
                  <button onClick={handleAddComment} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                    {isArabic ? 'إضافة' : 'Add'}
                  </button>
               </div>
               <div className="space-y-4">
                  {comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex justify-between mb-2">
                              <span className="font-bold text-gray-800">{comment.author}</span>
                              <span className="text-xs text-gray-500">{comment.date} {comment.time}</span>
                          </div>
                          <p className="text-gray-700">{comment.text}</p>
                      </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsModal;
