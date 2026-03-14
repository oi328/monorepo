import { useCompanySetup } from '../store/CompanySetupContext'

export default function SubscriptionPage() {
  const { companySetup } = useCompanySetup()
  const onUpgrade = () => alert('Upgrade flow (mock)')

  return (
    <Layout>
      <div className="company-setup-page p-3 sm:p-4">
        <PageHeader title="Subscription" description="View plan and available modules" />
        <Card>
          <SubscriptionCard subscription={companySetup.subscription} onUpgrade={onUpgrade} />
        </Card>
        <SaveButton onClick={() => {}} label="Close" />
      </div>
    </Layout>
  )
}