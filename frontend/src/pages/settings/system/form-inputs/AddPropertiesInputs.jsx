import { useTranslation } from 'react-i18next'
import DynamicFieldsManager from '../../../../components/settings/DynamicFieldsManager'

export default function AddPropertiesInputs() {
  const { t } = useTranslation()
  return (
    <DynamicFieldsManager 
        entityKey="properties" 
        title={t("Add Properties Inputs")}
        description={t("Customize the fields that appear when adding a new property")}
    />
  )
}
