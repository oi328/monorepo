import { useTranslation } from 'react-i18next'
import DynamicFieldsManager from '../../../../components/settings/DynamicFieldsManager'

export default function AddCustomerInputs() {
  const { t } = useTranslation()
  return (
    <DynamicFieldsManager 
        entityKey="customers" 
        title={t("Add Customer Inputs")}
        description={t("Customize the fields that appear when adding a new customer")}
    />
  )
}
