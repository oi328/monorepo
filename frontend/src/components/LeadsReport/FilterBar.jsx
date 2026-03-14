
const FilterBar = ({
  startDate,
  endDate,
  salesperson,
  salespeople = [],
  onChange,
  onUpdate,
  updating = false
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3">
      <div className="flex items-center gap-2">
        <LuCalendarRange className="text-gray-300" />
        <input
          type="date"
          name="startDate"
          value={startDate || ''}
          onChange={onChange}
          className="px-3 py-2 rounded-md border border-gray-700 bg-gray-800 text-gray-100"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          name="endDate"
          value={endDate || ''}
          onChange={onChange}
          className="px-3 py-2 rounded-md border border-gray-700 bg-gray-800 text-gray-100"
        />
      </div>
      <div className="flex items-center gap-2">
        <User className="text-gray-300" />
        <select
          name="salesperson"
          value={salesperson || ''}
          onChange={onChange}
          className="px-3 py-2 rounded-md border border-gray-700 bg-gray-800 text-gray-100 min-w-40"
        >
          <option value="">All Salespeople</option>
          {salespeople.map(sp => (
            <option key={sp} value={sp}>{sp}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 md:ml-auto">
        <button 
          onClick={onUpdate}
          disabled={updating}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {updating ? <Loader className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}

export default FilterBar