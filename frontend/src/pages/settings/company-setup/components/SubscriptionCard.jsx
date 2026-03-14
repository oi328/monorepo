
export default function SubscriptionCard({ subscription, onUpgrade }) {
  const plan = subscription?.plan || 'Free'
  const features = subscription?.features || []
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-medium">Current Plan: {plan}</div>
          <div className="text-sm company-setup-desc mt-1">Available Modules</div>
        </div>
        <button onClick={onUpgrade} className="px-3 py-2 btn-accent">Upgrade Plan</button>
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
        {features.map(f => (
          <div key={f} className="px-3 py-2 company-chip text-sm">{f}</div>
        ))}
      </div>
    </div>
  )
}