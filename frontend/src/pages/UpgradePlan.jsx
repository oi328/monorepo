
export default function UpgradePlan() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Upgrade Plan</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Your current plan limits access to this feature. Please upgrade to unlock advanced modules and settings.
      </p>
      <div className="mt-4 flex gap-3">
        <a href="#" className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm">View Plans</a>
        <a href="#" className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-sm">Contact Sales</a>
      </div>
    </div>
  )
}