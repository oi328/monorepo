
export default function PageHeader({ title, description }) {
  return (
    <div className="mb-3 sm:mb-4">
      <h1 className="company-setup-title text-xl sm:text-2xl font-semibold">{title}</h1>
      {description ? (
        <p className="company-setup-desc mt-1 text-xs sm:text-sm">{description}</p>
      ) : null}
    </div>
  )
}