
const MODULES = ['leads','clients','deals','reservations','contracts','operations','matching','billing','reports','notifications','integrations']

export default function VisibilityMatrix({ departments = [], visibility = {}, onChange }) {
  const toggle = (deptName, moduleKey) => {
    const cur = visibility[deptName] || []
    const has = cur.includes(moduleKey)
    const nextDept = has ? cur.filter(m => m !== moduleKey) : [...cur, moduleKey]
    const next = { ...visibility, [deptName]: nextDept }
    onChange && onChange(next)
  }

  return (
    <div className="overflow-x-auto">
      <table className="company-table nova-table w-full text-xs sm:text-sm min-w-[720px]">
        <thead>
          <tr>
            <th className="text-left p-2">Department</th>
            {MODULES.map(m => (
              <th key={m} className="p-2 text-[10px] sm:text-xs font-medium company-setup-desc">{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {departments.map(d => (
            <tr key={d.id}>
              <td className="p-2 font-medium">{d.name}</td>
              {MODULES.map(m => {
                const checked = (visibility[d.name] || []).includes(m)
                return (
                  <td key={m} className="p-2 text-center">
                    <input type="checkbox" checked={checked} onChange={() => toggle(d.name, m)} />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}