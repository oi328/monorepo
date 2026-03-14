import { useCompanySetup } from '../store/CompanySetupContext'

export default function DepartmentsPage() {
  const { companySetup, addDepartment, updateDepartment } = useCompanySetup()
  const onDelete = (id) => alert(`Delete ${id} (mock)`) // could update context as well

  return (
    <>
      <div className="company-setup-page p-3 sm:p-4">
        <PageHeader title="Departments" description="Manage departments and roles" />
        <Card>
          <DepartmentsTable departments={companySetup.departments} onAdd={addDepartment} onUpdate={updateDepartment} onDelete={onDelete} />
        </Card>
        <SaveButton onClick={() => {}} />
      </div>
    </>
  )
}
