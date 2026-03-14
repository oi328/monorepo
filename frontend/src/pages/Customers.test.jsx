import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Customers } from './Customers'

// Mock Translations
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() }
  })
}))

// Mock ThemeProvider
jest.mock('../shared/context/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' })
}))

jest.mock('../shared/context/AppStateProvider', () => ({
  useAppState: () => ({
    user: {
      id: 1,
      name: 'Test User',
      role: 'Customer Manager',
      meta_data: { module_permissions: { Customers: ['showModule', 'addCustomer', 'editInfo', 'deleteCustomer'] } },
    },
    company: { company_type: 'General' },
    crmSettings: {},
  }),
}))

// Mock API
const mockApiGet = jest.fn()
jest.mock('../utils/api', () => ({
  api: {
    get: (...args) => mockApiGet(...args),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}))

// Mock DatePicker
jest.mock('react-datepicker', () => {
  return function MockDatePicker({ selectsRange, startDate, endDate, onChange, placeholderText }) {
    return (
      <div data-testid="date-picker-wrapper">
        <input 
          data-testid="date-picker-input"
          placeholder={placeholderText}
          value={startDate ? `${startDate.toISOString().split('T')[0]} - ${endDate ? endDate.toISOString().split('T')[0] : ''}` : ''}
          readOnly
        />
        <button 
          data-testid="date-picker-select-today" 
          onClick={() => {
            const today = new Date()
            onChange([today, today])
          }}
        >
          Select Today
        </button>
      </div>
    )
  }
})

// Mock Sub-components
jest.mock('../components/CustomersImportModal', () => {
  return function MockImportModal({ onClose, onImport }) {
    return (
      <div data-testid="import-modal">
        <button onClick={onClose}>Close Import</button>
        <button onClick={() => onImport([{ name: 'Test Customer' }])}>Import Data</button>
      </div>
    )
  }
})

jest.mock('../components/CustomersFormModal', () => {
  return function MockFormModal({ onClose }) {
    return (
      <div data-testid="form-modal">
        <button onClick={onClose}>Close Form</button>
      </div>
    )
  }
})

jest.mock('../components/SearchableSelect', () => {
  return function MockSelect({ placeholder, onChange, multiple, value, options }) {
    return (
      <div data-testid="search-select-wrapper">
        <label>{placeholder}</label>
        <select 
          data-testid={`search-select-${placeholder}`} 
          onChange={(e) => {
             const val = e.target.value
             if (multiple) {
               onChange(val ? [val] : [])
             } else {
               onChange({ value: val, label: val })
             }
          }} 
          aria-label={placeholder}
          multiple={multiple}
          value={multiple ? (value || []) : (value?.value || '')}
        >
          <option value="">{placeholder}</option>
          {options && options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    )
  }
})

// Mock window.confirm
const originalConfirm = window.confirm
beforeAll(() => {
  window.confirm = jest.fn(() => true)
})
afterAll(() => {
  window.confirm = originalConfirm
})

// Clear localStorage before tests
beforeEach(() => {
  localStorage.clear()
})

describe('Customers Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockApiGet.mockImplementation((url) => {
      if (typeof url === 'string' && url.startsWith('/api/customers?')) {
        return Promise.resolve({
          data: {
            data: [
              { id: '1', name: 'Ahmed Mohamed', phone: '0100', email: 'ahmed@example.com', company_name: 'ACME', customer_code: 'C-1' },
              { id: '2', name: 'John Doe', phone: '0111', email: 'john@example.com', company_name: 'Globex', customer_code: 'C-2' },
            ],
          },
        })
      }
      if (url === '/api/users') {
        return Promise.resolve({ data: { data: [{ id: 1, name: 'Test User' }] } })
      }
      if (url === '/api/users?all=1') {
        return Promise.resolve({ data: { data: [{ id: 1, name: 'Test User' }] } })
      }
      return Promise.resolve({ data: {} })
    })
  })

  test('renders customers page title', () => {
    render(<Customers />)
    expect(screen.getByText('Customers')).toBeInTheDocument()
  })

  test('opens import modal when import button is clicked', () => {
    render(<Customers />)
    const importBtn = screen.getByText('Import')
    fireEvent.click(importBtn)
    expect(screen.getByTestId('import-modal')).toBeInTheDocument()
  })

  test('opens add customer form when add button is clicked', () => {
    render(<Customers />)
    const addBtn = screen.getByText('Add Customer')
    fireEvent.click(addBtn)
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
  })

  test('filters customers by search query', async () => {
    render(<Customers />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getAllByText('Ahmed Mohamed').length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    const searchInput = screen.getByPlaceholderText('Search in all data...')
    fireEvent.change(searchInput, { target: { value: 'John' } }) // Search for John

    // Should show John
    await waitFor(() => {
       expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0)
    }, { timeout: 5000 })

    // Should not show Ahmed
    expect(screen.queryAllByText('Ahmed Mohamed').length).toBe(0)
  }, 10000)

  test('toggles advanced filters', () => {
    render(<Customers />)
    
    // Initially "Show All" button exists
    const toggleBtn = screen.getByText('Show All')
    
    // Click to show
    fireEvent.click(toggleBtn)
    expect(screen.getByText('Hide')).toBeInTheDocument()
  })

  test('resets filters when Reset button is clicked', async () => {
    render(<Customers />)
    
    const searchInput = screen.getByPlaceholderText('Search in all data...')
    fireEvent.change(searchInput, { target: { value: 'Ahmed' } })
    expect(searchInput.value).toBe('Ahmed')

    const resetBtn = screen.getByText('Reset')
    fireEvent.click(resetBtn)

    expect(searchInput.value).toBe('')
  })
  
  test('handles date range filter', async () => {
    render(<Customers />)
    
    // Expand filters to see date inputs
    const toggleBtn = screen.getByText('Show All')
    fireEvent.click(toggleBtn)
    
    // Find DatePicker mock trigger
    const selectTodayBtn = screen.getByTestId('date-picker-select-today')
    fireEvent.click(selectTodayBtn)
    
    // Check if date input is populated
    const today = new Date().toISOString().split('T')[0]
    const dateInput = screen.getByTestId('date-picker-input')
    expect(dateInput.value).toContain(today)
  })

  test('shows bulk action bar when items are selected', async () => {
    render(<Customers />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getAllByText('Ahmed Mohamed').length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    // Find checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    // First checkbox is "select all", second is for first row
    const firstRowCheckbox = checkboxes[1]
    
    // Click to select
    fireEvent.click(firstRowCheckbox)
    
    expect(screen.getByText('Export Selected (1)')).toBeInTheDocument()
  })
})
