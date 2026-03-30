import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import EnhancedLeadDetailsModal from './EnhancedLeadDetailsModal'

let mockUser = { id: 1, role: 'Manager', name: 'Manager 1' }
let mockLead = { id: 15, assignedSalesId: null, assigned_to: null, permissions: {} }

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}))

jest.mock('../context/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light' }),
}))

jest.mock('../context/AppStateProvider', () => ({
  useAppState: () => ({
    user: mockUser,
    company: { id: 1, company_type: 'General' },
    crmSettings: {},
  }),
}))

jest.mock('@hooks/useStages', () => ({
  useStages: () => ({ stages: [], loading: false }),
}))

jest.mock('../../echo', () => ({
  __esModule: true,
  default: null,
}))

jest.mock('../../components/EditLeadModal', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('../../components/AddActionModal', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('../../components/PaymentPlanModal', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('../../components/CreateRequestModal', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('./ReAssignLeadModal', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('../../services/whatsappService', () => ({
  getLeadWhatsappMessages: jest.fn(() => Promise.resolve([])),
  sendWhatsappTemplate: jest.fn(() => Promise.resolve({})),
  sendWhatsappText: jest.fn(() => Promise.resolve({})),
  getWhatsappTemplates: jest.fn(() => Promise.resolve([])),
}))

jest.mock('../../services/emailService', () => ({
  getLeadEmailMessages: jest.fn(() => Promise.resolve([])),
  sendEmailText: jest.fn(() => Promise.resolve({})),
}))

jest.mock('../../services/emailTemplateService', () => ({
  getEmailTemplates: jest.fn(() => Promise.resolve([])),
}))

const mockApiGet = jest.fn()
jest.mock('../../utils/api', () => ({
  api: {
    get: (...args) => mockApiGet(...args),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}))

describe('EnhancedLeadDetailsModal add action visibility for Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockApiGet.mockImplementation((url, opts) => {
      if (url === `/api/leads/${mockLead.id}`) {
        return Promise.resolve({ data: mockLead })
      }
      if (url === '/api/lead-actions') {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({ data: {} })
    })
  })

  test('hides Add Action button when lead is assigned to another sales user', async () => {
    mockUser = {
      id: 1,
      role: 'Manager',
      name: 'Manager 1',
      meta_data: { module_permissions: { Leads: ['addAction'] } },
    }
    mockLead = { id: 15, assignedSalesId: 2, permissions: {} }

    render(<EnhancedLeadDetailsModal lead={mockLead} isOpen={true} onClose={() => {}} />)

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(`/api/leads/${mockLead.id}`)
    })

    expect(screen.queryByLabelText('Add Action')).not.toBeInTheDocument()
  })

  test('hides Add Action button when lead is unassigned', async () => {
    mockUser = {
      id: 1,
      role: 'Manager',
      name: 'Manager 1',
      meta_data: { module_permissions: { Leads: ['addAction'] } },
    }
    mockLead = { id: 15, assignedSalesId: null, permissions: {} }

    render(<EnhancedLeadDetailsModal lead={mockLead} isOpen={true} onClose={() => {}} />)

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(`/api/leads/${mockLead.id}`)
    })

    expect(screen.queryByLabelText('Add Action')).not.toBeInTheDocument()
  })

  test('shows Add Action button when lead is assigned to the current Manager as Sales', async () => {
    mockUser = {
      id: 1,
      role: 'Manager',
      name: 'Manager 1',
      meta_data: { module_permissions: { Leads: ['addAction'] } },
    }
    mockLead = { id: 15, assignedSalesId: 1, permissions: {} }

    render(<EnhancedLeadDetailsModal lead={mockLead} isOpen={true} onClose={() => {}} />)

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(`/api/leads/${mockLead.id}`)
    })

    expect(await screen.findByLabelText('Add Action')).toBeInTheDocument()
  })
})
