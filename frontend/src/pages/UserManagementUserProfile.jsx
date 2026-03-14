import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@utils/api';
import { X } from 'lucide-react';
import UserManagementUserCreate from '@features/Users/UserForm.jsx';
import Layout from '@components/Layout.jsx';

// User Profile Page
export default function UserManagementUserProfile({ userProp, idProp, asModal = false, onClose, onUpdate }) {
  const { id: routeId } = useParams();
  const id = idProp || routeId;
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [user, setUser] = useState(userProp || null);
  const [loading, setLoading] = useState(!userProp && !!id);

  useEffect(() => {
    if (userProp || !id) return;

    let cancelled = false;

    const fetchUser = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/users/${id}`);
        const data = res.data;
        const normalized = {
          ...data,
          fullName: data.name,
          role: Array.isArray(data.roles) && data.roles[0]?.name
            ? data.roles[0].name
            : (data.job_title || data.role || ''),
          status: data.status || 'Active',
          department: data.department?.id || data.department_id || '',
          branch: data.branch || '',
          region: data.region || '',
          area: data.area || '',
          notifEmail: data.notif_email ?? true,
          notifSms: data.notif_sms ?? false,
        };
        if (!cancelled) {
          setUser(normalized);
        }
      } catch (err) {
        console.error('Failed to load user details', err);
        window.dispatchEvent(new CustomEvent('app:toast', {
          detail: {
            type: 'error',
            message: isArabic ? 'فشل تحميل بيانات المستخدم' : 'Failed to load user data',
          },
        }));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [id, userProp, isArabic]);

  if (asModal) {
    const effectiveUser = user || userProp;

    if (!effectiveUser) {
      return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <div className="relative w-full max-w-sm max-h-[90vh] flex items-center justify-center">
            <span className="loading loading-spinner loading-lg" />
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-hidden">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-[var(--content-bg)] text-[var(--content-text)] border border-base-300 shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
           <button 
             onClick={onClose}
             className="absolute top-6 right-6 z-20 btn btn-circle btn-sm btn-ghost bg-base-100/50 hover:bg-base-100"
           >
             <X size={20} />
           </button>
           <UserManagementUserCreate 
             user={effectiveUser} 
             onClose={onClose}
             onSuccess={(updatedUser) => {
                if (onUpdate && updatedUser) onUpdate(updatedUser);
                if (onClose) onClose();
             }}
           />
        </div>
      </div>
    );
  }

  if (loading && !user) {
    return (
      <Layout title={isArabic ? 'تحميل بيانات المستخدم' : 'Loading user'}>
        <div className="flex justify-center items-center h-screen">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout title={isArabic ? 'المستخدم غير موجود' : 'User not found'}>
        <div className="p-6 max-w-5xl mx-auto text-sm text-red-500">
          {isArabic ? 'لم يتم العثور على هذا المستخدم.' : 'User could not be found.'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={isArabic ? `تعديل المستخدم — ${user.fullName || user.name}` : `Edit User — ${user.fullName || user.name}`}>
      <div className="p-6 max-w-5xl mx-auto">
        <UserManagementUserCreate 
           user={user}
           onSuccess={() => navigate('/user-management/users')}
        />
      </div>
    </Layout>
  );
}
