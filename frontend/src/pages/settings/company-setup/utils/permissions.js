export function canView(moduleKey, user, permissions) {
  if (!moduleKey) return false
  const modules = permissions?.modules || []
  const depPerm = permissions?.departments || {}

  // If user has no department specified, allow based on modules only.
  if (!user || !user.department) {
    return modules.includes(moduleKey)
  }
  const deptMods = depPerm[user.department] || []
  return modules.includes(moduleKey) && deptMods.includes(moduleKey)
}