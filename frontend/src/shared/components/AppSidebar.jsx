import { useTranslation } from 'react-i18next'
import { Sidebar } from './Sidebar'

export default function AppSidebar({ open = false, onClose, className = '', collapsed, setCollapsed }) {
  const { i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  return (
    <>
      
      <Sidebar
        className={`${className}`}
        isOpen={open}
        onClose={onClose}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
    </>
  )
}
