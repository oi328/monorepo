
const MODULES = ['leads','clients','deals','reservations','contracts','operations','matching','billing','reports','notifications','integrations']

export default function ModulesToggleList({ enabledModules, onToggle }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {MODULES.map(m => (
        <label key={m} className="flex items-center gap-2">
          <input type="checkbox" checked={enabledModules.includes(m)} onChange={() => onToggle(m)} />
          <span className="text-sm">{m}</span>
        </label>
      ))}
    </div>
  )}