import { useTranslation } from 'react-i18next'
import DynamicFieldsManager from '../../../../components/settings/DynamicFieldsManager'

export default function AddBrokerInputs() {
  const { t } = useTranslation()
  return (
    <DynamicFieldsManager 
        entityKey="brokers" 
        title={t("Add Broker Inputs")}
        description={t("Customize the fields that appear when adding a new broker")}
    />
  )
}
