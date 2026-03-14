
export default function SubscriptionExpired() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-700 p-6 space-y-3">
        <h2 className="text-xl font-semibold">Subscription Expired</h2>
        <p>Your subscription has expired. Please renew to continue.</p>
      </div>
    </div>
  )
}