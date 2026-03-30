import { useCallback, useEffect, useMemo, useState } from 'react';
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
  FaFileAlt,
  FaTrash,
  FaUpload
} from 'react-icons/fa';
import { api } from '../utils/api';

const CustomerDetailsModal = ({ isOpen, onClose, customer, initialTab = 'details' }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [comments, setComments] = useState([]);
  const customerId = customer?.id;

  const formatBytes = (bytes) => {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return null;
    const units = ['B', 'KB', 'MB', 'GB'];
    const idx = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
    const value = n / (1024 ** idx);
    const rounded = idx === 0 ? Math.round(value) : Math.round(value * 10) / 10;
    return `${rounded} ${units[idx]}`;
  };

  const getFileIcon = (name, type) => {
    const ext = (String(name || '').split('.').pop() || '').toLowerCase();
    if (type === 'application/pdf' || ext === 'pdf') return { Icon: FaFilePdf, tone: 'red' };
    if ((type || '').startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return { Icon: FaFileImage, tone: 'blue' };
    return { Icon: FaFileAlt, tone: 'gray' };
  };

  const attachmentsCount = useMemo(
    () => (Array.isArray(attachments) ? attachments.length : 0),
    [attachments]
  );

  const fetchAttachments = useCallback(async () => {
    if (!customerId) return;
    setAttachmentsLoading(true);
    try {
      const res = await api.get(`/api/customers/${encodeURIComponent(customerId)}/attachments`);
      setAttachments(Array.isArray(res.data?.attachments) ? res.data.attachments : []);
    } catch (e) {
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (!showAttachments) return;
    fetchAttachments();
  }, [showAttachments, fetchAttachments]);

  const fetchComments = useCallback(async () => {
    if (!customerId) return;
    setCommentsLoading(true);
    try {
      const res = await api.get(`/api/customers/${encodeURIComponent(customerId)}/comments`);
      setComments(Array.isArray(res.data?.comments) ? res.data.comments : []);
    } catch (e) {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (!isOpen || !customerId) return;
    if (activeTab !== 'comments') return;
    fetchComments();
  }, [isOpen, customerId, activeTab, fetchComments]);

  const uploadAttachments = async (files) => {
    if (!customerId || !files?.length) return;
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('attachments[]', file));

    setAttachmentsUploading(true);
    try {
      const res = await api.post(`/api/customers/${encodeURIComponent(customerId)}/attachments`, formData);
      setAttachments(Array.isArray(res.data?.attachments) ? res.data.attachments : []);
    } catch (e) {
      const msg = e?.response?.data?.message || (isArabic ? 'فشل رفع المرفقات' : 'Failed to upload attachments');
      alert(msg);
    } finally {
      setAttachmentsUploading(false);
    }
  };

  const deleteAttachment = async (attachmentId) => {
    if (!customerId || !attachmentId) return;
    try {
      const res = await api.delete(`/api/customers/${encodeURIComponent(customerId)}/attachments/${encodeURIComponent(attachmentId)}`);
      setAttachments(Array.isArray(res.data?.attachments) ? res.data.attachments : []);
    } catch (e) {
      const msg = e?.response?.data?.message || (isArabic ? 'فشل حذف المرفق' : 'Failed to delete attachment');
      alert(msg);
    }
  };

  const handleAddComment = async () => {
    const text = String(newComment || '').trim();
    if (!text || !customerId) return;

    setCommentSubmitting(true);
    try {
      const res = await api.post(`/api/customers/${encodeURIComponent(customerId)}/comments`, { text });
      const comment = res.data?.comment || null;
      const next = Array.isArray(res.data?.comments) ? res.data.comments : null;

      if (next) {
        setComments(next);
      } else if (comment) {
        setComments((prev) => [...(Array.isArray(prev) ? prev : []), comment]);
      }
      setNewComment('');
    } catch (e) {
      const msg = e?.response?.data?.message || (isArabic ? 'فشل إضافة التعليق' : 'Failed to add comment');
      alert(msg);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const formatCommentTime = (createdAt) => {
    if (!createdAt) return '';
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return String(createdAt);
    const date = d.toISOString().split('T')[0];
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
  };

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-0 sm:p-4 backdrop-blur-sm">
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
                <h2 className="text-2xl font-bold text-white mb-1">{customer.name}</h2>
                <p className="text-blue-100 text-sm font-medium">{isArabic ? 'تفاصيل العميل' : 'Customer Details'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowAttachments(true)}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-4 py-2 shadow-lg flex items-center gap-2 backdrop-blur-sm transition-colors h-auto"
                >
                  <FaPaperclip size={14} />
                  <span className="hidden sm:inline text-sm font-medium">
                    {isArabic ? 'المرفقات' : 'Attachments'}
                    {attachmentsCount ? ` (${attachmentsCount})` : ''}
                  </span>
                </button>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                  <span className="text-white text-sm font-medium">{customer.type}</span>
                </div>
                <div className="bg-green-500/20 backdrop-blur-sm rounded-xl px-4 py-2">
                  <span className="text-green-100 text-sm font-medium">{customer.source}</span>
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
                {Array.isArray(comments) ? comments.length : 0}
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1 relative">
          {/* Attachments Overlay */}
          {showAttachments && (
            <div className="absolute inset-0 z-[50] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
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
                  <div className="flex items-center justify-between gap-3">
                    <label className={`btn btn-sm ${attachmentsUploading ? 'btn-disabled' : 'btn-primary'} gap-2`}>
                      <FaUpload />
                      {isArabic ? 'رفع مرفق' : 'Upload'}
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        disabled={attachmentsUploading}
                        onChange={(e) => uploadAttachments(e.target.files)}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={fetchAttachments}
                      disabled={attachmentsLoading}
                    >
                      {isArabic ? 'تحديث' : 'Refresh'}
                    </button>
                  </div>

                  {attachmentsLoading ? (
                    <div className="p-6 text-center text-gray-500">{isArabic ? 'جاري التحميل...' : 'Loading...'}</div>
                  ) : attachments.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">{isArabic ? 'لا توجد مرفقات' : 'No attachments yet'}</div>
                  ) : (
                    <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                      {attachments.map((att) => {
                        const name = att?.name || att?.file_name || 'Attachment';
                        const sizeText = formatBytes(att?.size);
                        const uploadedAt = att?.uploaded_at || att?.created_at || null;
                        const meta = [
                          sizeText,
                          uploadedAt ? new Date(uploadedAt).toLocaleDateString() : null
                        ].filter(Boolean).join(' • ');

                        const { Icon, tone } = getFileIcon(name, att?.type || att?.mime_type);
                        const toneCls =
                          tone === 'red'
                            ? 'bg-red-100 text-red-500'
                            : tone === 'blue'
                              ? 'bg-blue-100 text-blue-500'
                              : 'bg-gray-100 text-gray-500';

                        return (
                          <div
                            key={att.id || name}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-blue-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-10 h-10 ${toneCls} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <Icon size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-gray-800 text-sm truncate">{name}</p>
                                <p className="text-xs text-gray-500 truncate">{meta || '-'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {att?.url && (
                                <a
                                  className="text-gray-400 hover:text-blue-600 opacity-100 transition-opacity"
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={isArabic ? 'تحميل' : 'Download'}
                                >
                                  <FaDownload />
                                </a>
                              )}
                              {att?.id && (
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-red-600 opacity-100 transition-opacity"
                                  onClick={() => deleteAttachment(att.id)}
                                  title={isArabic ? 'حذف' : 'Delete'}
                                >
                                  <FaTrash />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                  {isArabic ? 'معلومات العنوان' : 'Address Information'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'البلد' : 'Country'}</label>
                    <p className="text-gray-800 font-medium">{customer.country || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'المدينة' : 'City'}</label>
                    <p className="text-gray-800 font-medium">{customer.city || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 md:col-span-3">
                    <label className="block text-sm font-medium text-gray-500 mb-2">{isArabic ? 'العنوان' : 'Address'}</label>
                    <p className="text-gray-800 font-medium">{customer.addressLine || customer.address || (isArabic ? 'غير محدد' : 'Not specified')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-6">
              {/* Add Comment */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{isArabic ? 'إضافة تعليق' : 'Add Comment'}</h3>
                <div className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={isArabic ? 'اكتب تعليق...' : 'Write a comment...'}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none min-h-[100px]"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={commentSubmitting || !String(newComment || '').trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {commentSubmitting ? (isArabic ? 'جاري الإضافة...' : 'Adding...') : (isArabic ? 'إضافة تعليق' : 'Add Comment')}
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center justify-between">
                  <span>{isArabic ? 'التعليقات' : 'Comments'}</span>
                  {commentsLoading && <span className="loading loading-spinner loading-sm"></span>}
                </h3>

                {!commentsLoading && comments.length === 0 && (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
                    <FaComments className="text-gray-300 text-4xl mx-auto mb-3" />
                    <p className="text-gray-500">{isArabic ? 'لا توجد تعليقات بعد' : 'No comments yet'}</p>
                  </div>
                )}

                {comments.map((comment) => (
                  <div key={comment.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FaUser className="text-blue-600 text-sm" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{comment.author || (isArabic ? 'المستخدم' : 'User')}</p>
                          <p className="text-sm text-gray-500">{formatCommentTime(comment.created_at || comment.createdAt) || comment.date}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{comment.text}</p>
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
