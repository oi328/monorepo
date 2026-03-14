import { useTranslation } from 'react-i18next'
import DynamicFieldsManager from '../../../../components/settings/DynamicFieldsManager'

export default function AddLeadInputs() {
  const { t } = useTranslation()
  return (
    <DynamicFieldsManager 
        entityKey="leads" 
        title={t("Add Lead Inputs")}
        description={t("Customize the fields that appear when adding a new lead")}
    />
  )
}
