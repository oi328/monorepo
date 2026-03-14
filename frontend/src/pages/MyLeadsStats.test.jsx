import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
let Leads

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() }
  })
}))

jest.mock('../shared/context/AppStateProvider', () => ({
  useAppState: () => ({
    user: { id: 123, name: 'John Doe', role: 'Sales Person' },
    company: { company_type: 'General' },
    crmSettings: {},
  })
}))

jest.mock('../echo', () => ({
  __esModule: true,
  default: null,
}))

const mockApiGet = jest.fn()
jest.mock('../utils/api', () => ({
  api: {
    get: (...args) => mockApiGet(...args),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}))

describe('My Leads Stats cards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Leads = require('./Leads').Leads
    mockApiGet.mockImplementation((url, { params } = {}) => {
      if (url === '/api/admin/fields?entity=leads') {
        return Promise.resolve({ data: [] })
      }
      if (url === '/api/leads/stats') {
        return Promise.resolve({
          data: {
            total: 1234,
            byStage: { 'Meeting': 1, 'New Lead': 2 }
          }
        })
      }
      if (url === '/api/stages?active=1') {
        return Promise.resolve({ data: { data: [{ name: 'Meeting' }, { name: 'New Lead' }] } })
      }
      if (url === '/api/sources?active=1') {
        return Promise.resolve({ data: { data: [] } })
      }
      if (url === '/api/campaigns') {
        return Promise.resolve({ data: { data: [] } })
      }
      if (url === '/api/users') {
        return Promise.resolve({ data: { data: [{ id: 123, name: 'John Doe' }] } })
      }
      if (url === '/api/leads') {
        return Promise.resolve({ data: { data: [] } })
      }
      return Promise.resolve({ data: {} })
    })
  })

  test('calls stats API filtered by current user and shows formatted numbers', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/leads/my-leads']}>
          <Leads />
        </MemoryRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      const calledWithMine = mockApiGet.mock.calls.some(([u, o]) => {
        if (u !== '/api/leads/stats') return false
        const assignedToRaw = Array.isArray(o?.params?.assigned_to) ? o.params.assigned_to : (o?.params?.assigned_to ? [o.params.assigned_to] : [])
        const assignedTo = assignedToRaw.map(v => String(v))
        return assignedTo.includes('123')
      })
      expect(calledWithMine).toBe(true)
    }, { timeout: 2000 })

    await waitFor(() => {
      const label = screen.getByText('total leads')
      const btn = label.closest('button')
      expect(btn).toBeTruthy()
      expect(btn.textContent).toMatch(/1[,٬]234/)
    }, { timeout: 5000 })
  }, 15000)
})
