import { useTranslation } from 'react-i18next'
import DynamicFieldsManager from '../../../../components/settings/DynamicFieldsManager'

export default function AddItemInputs() {
  const { t } = useTranslation()
  return (
    <DynamicFieldsManager 
        entityKey="items" 
        title={t("Add Item Inputs")}
        description={t("Customize the fields that appear when adding a new item")}
    />
  )
}
