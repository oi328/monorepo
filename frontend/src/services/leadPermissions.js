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

