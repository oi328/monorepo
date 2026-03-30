export function canManagerAddActionForLead({ currentUser, lead }) {
  const role = currentUser?.role;
  if (role !== 'Manager') return true;

  const assignedSalesId =
    lead?.assignedSalesId ??
    lead?.assigned_to ??
    (typeof lead?.assignedTo === 'object' ? lead?.assignedTo?.id : lead?.assignedTo);

  if (assignedSalesId === null || assignedSalesId === undefined || assignedSalesId === '') return false;

  return String(assignedSalesId) === String(currentUser?.id);
}

const LEADS_MODULE = 'Leads'

const normalizeRole = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

const toRoleList = (user) => {
  const directRole = normalizeRole(user?.role)
  const nestedRoles = Array.isArray(user?.roles)
    ? user.roles.map((role) => normalizeRole(role?.name || role))
    : []

  return [directRole, ...nestedRoles].filter(Boolean)
}

const TENANT_ADMIN_ROLES = new Set(['admin', 'tenant admin', 'tenant-admin'])
const SUPER_ADMIN_ROLES = new Set(['super admin', 'superadmin', 'owner'])

export function isTenantAdminUser(user) {
  return toRoleList(user).some((role) => TENANT_ADMIN_ROLES.has(role))
}

export function isSuperAdminUser(user) {
  if (user?.is_super_admin) return true
  return toRoleList(user).some((role) => SUPER_ADMIN_ROLES.has(role))
}

export function isPrivilegedLeadUser(user) {
  return isSuperAdminUser(user) || isTenantAdminUser(user)
}

export function getLeadModulePermissions(user) {
  const modulePermissions = user?.meta_data?.module_permissions
  const leadPerms = modulePermissions?.[LEADS_MODULE]
  return Array.isArray(leadPerms) ? leadPerms : []
}

export function hasLeadPermission(user, permissionKey) {
  if (!permissionKey) return false
  if (isPrivilegedLeadUser(user)) return true
  return getLeadModulePermissions(user).includes(permissionKey)
}

export function getLeadPermissionFlags(user) {
  return {
    canAddLead: hasLeadPermission(user, 'addLead'),
    canShowCreator: hasLeadPermission(user, 'showCreator'),
    canEditInfo: hasLeadPermission(user, 'editInfo'),
    canEditPhone: hasLeadPermission(user, 'editPhone'),
    canImportLeads: hasLeadPermission(user, 'importLeads'),
    canExportLeads: hasLeadPermission(user, 'exportLeads'),
    canViewDuplicateLeads: hasLeadPermission(user, 'viewDuplicateLeads'),
    canActOnDuplicateLeads: hasLeadPermission(user, 'actOnDuplicateLeads'),
    canAddAction: hasLeadPermission(user, 'addAction'),
  }
}
