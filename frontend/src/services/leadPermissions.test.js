import { canManagerAddActionForLead } from './leadPermissions'

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
