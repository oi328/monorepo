import { useCompanySetup } from '../store/CompanySetupContext'

export default function CompanyInfoPage() {
  const { companySetup, updateCompanyInfo } = useCompanySetup()

  return (
    <>
      <div className="company-setup-page p-3 sm:p-4">
        <PageHeader title="Company Information" description="Set basic details and logo" />
        <Card>
          <CompanyInfoForm initial={companySetup.companyInfo} onChange={updateCompanyInfo} />
        </Card>
        <SaveButton onClick={() => updateCompanyInfo(companySetup.companyInfo)} />
      </div>
    </>
  )
}
