export const REPORT_PERMISSION_MODULE_BY_KEY = {
  'Leads Pipeline': 'Leads Pipeline',
  'Sales Activities': 'Sales Activities',
  'Meetings Report': 'Meetings Report',
  'Reservations Report': 'Reservations Report',
  'Closed Deals': 'Closed Deals',
  'Rent Report': 'Rent Report',
  'Proposals Report': 'Proposals Report',
  'Check In Report': 'Check In Report',
  'Customers Report': 'Customers Report',
  'Targets & Revenue': 'Targets & Revenue',
  'Imports Report': 'Imports Report',
  'Exports Report': 'Exports Report',
};

export function getReportPermissions(user) {
  return (user?.meta_data?.module_permissions?.Reports || []);
}

export function canShowReport(user, reportName) {
  if (!user) return false;
  if (user.is_super_admin) return true;
  const reportPerms = getReportPermissions(user);
  return reportPerms.includes(`${reportName}_show`);
}

export function canExportReport(user, reportName) {
  if (!user) return false;
  if (user.is_super_admin) return true;
  const reportPerms = getReportPermissions(user);
  return reportPerms.includes(`${reportName}_export`);
}
