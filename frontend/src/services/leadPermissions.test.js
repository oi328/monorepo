import {
  canManagerAddActionForLead,
  getLeadPermissionFlags,
  hasLeadPermission,
  isPrivilegedLeadUser,
} from './leadPermissions'

describe('canManagerAddActionForLead', () => {
  test('returns true for non-Manager roles', () => {
    expect(
      canManagerAddActionForLead({
        currentUser: { id: 1, role: 'Sales Person' },
        lead: { assignedSalesId: null },
      })
    ).toBe(true)
  })

  test('returns false for Manager when lead is unassigned', () => {
    expect(
      canManagerAddActionForLead({
        currentUser: { id: 1, role: 'Manager' },
        lead: { assignedSalesId: null },
      })
    ).toBe(false)
  })

  test('returns false for Manager when assignedSalesId is empty string', () => {
    expect(
      canManagerAddActionForLead({
        currentUser: { id: 1, role: 'Manager' },
        lead: { assignedSalesId: '' },
      })
    ).toBe(false)
  })

  test('returns false for Manager when lead is assigned to another sales user', () => {
    expect(
      canManagerAddActionForLead({
        currentUser: { id: 1, role: 'Manager' },
        lead: { assignedSalesId: 2 },
      })
    ).toBe(false)
  })

  test('returns true for Manager when lead is assigned to the same user', () => {
    expect(
      canManagerAddActionForLead({
        currentUser: { id: 1, role: 'Manager' },
        lead: { assignedSalesId: 1 },
      })
    ).toBe(true)
  })

  test('falls back to assigned_to when assignedSalesId is missing', () => {
    expect(
      canManagerAddActionForLead({
        currentUser: { id: 1, role: 'Manager' },
        lead: { assigned_to: 1 },
      })
    ).toBe(true)
  })

  test('falls back to assignedTo object when assignedSalesId and assigned_to are missing', () => {
    expect(
      canManagerAddActionForLead({
        currentUser: { id: 1, role: 'Manager' },
        lead: { assignedTo: { id: 1 } },
      })
    ).toBe(true)
  })
})

describe('lead module permission helpers', () => {
  test('grants all lead permissions to tenant admin', () => {
    const user = { role: 'Tenant Admin' }
    expect(isPrivilegedLeadUser(user)).toBe(true)
    expect(hasLeadPermission(user, 'addLead')).toBe(true)
    expect(hasLeadPermission(user, 'exportLeads')).toBe(true)
  })

  test('does not grant role-only access without explicit permission', () => {
    const user = { role: 'Sales Person', meta_data: { module_permissions: { Leads: [] } } }
    expect(hasLeadPermission(user, 'addLead')).toBe(false)
    expect(hasLeadPermission(user, 'addAction')).toBe(false)
  })

  test('returns lead flags from explicit module permissions', () => {
    const user = {
      role: 'Sales Person',
      meta_data: {
        module_permissions: {
          Leads: ['addLead', 'showCreator', 'addAction'],
        },
      },
    }

    expect(getLeadPermissionFlags(user)).toEqual({
      canAddLead: true,
      canShowCreator: true,
      canEditInfo: false,
      canEditPhone: false,
      canImportLeads: false,
      canExportLeads: false,
      canViewDuplicateLeads: false,
      canActOnDuplicateLeads: false,
      canAddAction: true,
    })
  })
})
