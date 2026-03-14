# Permissions

## Manager add action visibility (Lead Details)

### Function

- Frontend: [canManagerAddActionForLead](file:///d:/fullstack/v1/frontend/src/services/leadPermissions.js)

### Purpose

Prevent managers from seeing the "Add Action" button unless the lead is assigned to them as the acting sales owner.

### Rules

When `currentUser.role === 'Manager'`:

- If the lead is **unassigned** (`lead.assignedSalesId` is empty/null) → `canAddAction = false`.
- If the lead is assigned to a **different** user (`lead.assignedSalesId !== currentUser.id`) → `canAddAction = false`.
- Only when the lead is assigned to the **same** manager (`lead.assignedSalesId === currentUser.id`) → the manager can see "Add Action" (subject to other existing owner/permission checks).

### Notes

- `assignedSalesId` is treated as the source of truth when present. For backward compatibility the function falls back to `assigned_to` / `assignedTo`.

