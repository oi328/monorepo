import { useCompanySetup } from '../store/CompanySetupContext'

export default function VisibilityPage() {
  const { companySetup, updateVisibility } = useCompanySetup()

  return (
    <>
      <div className="company-setup-page p-3 sm:p-4">
        <PageHeader title="Visibility Matrix" description="Assign module access per department" />
        <Card>
          <VisibilityMatrix departments={companySetup.departments} visibility={companySetup.visibility} onChange={updateVisibility} />
        </Card>
        <SaveButton onClick={() => updateVisibility(companySetup.visibility)} />
      </div>
    </>
  )
}
