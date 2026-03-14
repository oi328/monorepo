import { useCompanySetup } from '../store/CompanySetupContext'

export default function ModulesPage() {
  const { companySetup, toggleModule } = useCompanySetup()

  return (
    <>
      <div className="company-setup-page p-3 sm:p-4">
        <PageHeader title="Modules Activation" description="Enable or disable modules" />
        <Card>
          <ModulesToggleList enabledModules={companySetup.enabledModules} onToggle={toggleModule} />
        </Card>
        <SaveButton onClick={() => {}} />
      </div>
    </>
  )
}
