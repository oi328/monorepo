
export default function SaveButton({ onClick, label = 'Save Changes' }) {
  return (
    <div className="fixed bottom-4 right-4">
      <button onClick={onClick} className="px-4 py-2 btn-accent shadow">
        {label}
      </button>
    </div>
  )
}