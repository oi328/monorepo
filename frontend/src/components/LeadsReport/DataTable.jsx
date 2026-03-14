import { useTranslation } from 'react-i18next'

const DataTable = ({ columns = [], rows = [], align = [] }) => {
  const { i18n } = useTranslation()
  const isRTL = i18n.dir() === 'rtl'

  return (
    <>
      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {rows.map((row, i) => (
          <div key={i} className="card glass-card p-4 space-y-3 bg-white/5 border border-gray-800 rounded-lg">
            {columns.map((col, j) => (
              <div key={j} className="flex justify-between items-center border-b border-gray-800/50 pb-2 last:border-0 last:pb-0">
                <span className="text-gray-400 text-xs font-medium">{col}</span>
                <span className={`text-sm ${align[j] === 'right' ? (isRTL ? 'text-left' : 'text-right') : (align[j] === 'center' ? 'text-center' : (isRTL ? 'text-right' : 'text-left'))}`}>{row[j]}</span>
              </div>
            ))}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="text-center py-8 text-gray-500">{isRTL ? 'لا توجد بيانات' : 'No data'}</div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-xl border border-gray-800 bg-[#0b1220] overflow-auto">
        <table className="w-full text-sm nova-table nova-table--glass">
          <thead className="sticky top-0 bg-gray-50/5 dark:bg-gray-800/20 text-gray-900 dark:text-gray-100">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={`px-3 py-2 font-medium ${align[i] === 'right' ? 'text-end' : (align[i] === 'center' ? 'text-center' : 'text-start')}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="odd:bg-gray-900 even:bg-gray-800 hover:bg-gray-700 transition">
                {r.map((cell, j) => (
                  <td key={j} className={`px-3 py-2 ${align[j] === 'right' ? 'text-end' : (align[j] === 'center' ? 'text-center' : 'text-start')}`}>{cell}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-center text-gray-400" colSpan={columns.length}>{isRTL ? 'لا توجد بيانات' : 'No data'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default DataTable