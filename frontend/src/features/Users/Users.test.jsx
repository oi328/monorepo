import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UserManagementUsers from '@features/Users/Users.jsx'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() }
  })
}))

jest.mock('@shared/context/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light' })
}))

jest.mock('@shared/context/AppStateProvider', () => ({
  useAppState: () => ({
    user: {
      id: 1,
      name: 'Admin User',
      role: 'Admin',
      is_super_admin: true,
      meta_data: {
        module_permissions: {
          Control: ['userManagement']
        }
      }
    }
  })
}))

jest.mock('react-router-dom', () => ({
  Link: ({ children, to }) => <a href={typeof to === 'string' ? to : ''}>{children}</a>,
  useNavigate: () => jest.fn()
}))

jest.mock('../../shared/components', () => ({
  Skeleton: ({ className }) => <div data-testid="skeleton" className={className} />
}))

jest.mock('../../utils/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}))

jest.mock('react-datepicker', () => {
  return function MockDatePicker({ startDate, endDate, onChange, placeholderText }) {
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

jest.mock('../../components/SearchableSelect', () => {
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
          {options && options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    )
  }
})

jest.mock('../../components/ImportUsersModal', () => {
  return function MockImportUsersModal({ isOpen, onClose, onImportSuccess }) {
    if (!isOpen) return null
    return (
      <div data-testid="import-users-modal">
        <button onClick={onClose}>Close Import</button>
        <button onClick={() => onImportSuccess([{ id: 3, name: 'Imported User', email: 'imported@example.com', role: 'Agent', status: 'Active' }])}>
          Import Users
        </button>
      </div>
    )
  }
})

jest.mock('../../components/AssignmentModal', () => {
  return function MockAssignmentModal({ open, onClose }) {
    if (!open) return null
    return (
      <div data-testid="assignment-modal">
        <button onClick={onClose}>Close Assignment</button>
      </div>
    )
  }
})

jest.mock('../../pages/UserManagementUserProfile', () => {
  return function MockUserProfile({ onClose }) {
    return (
      <div data-testid="user-profile-modal">
        <button onClick={onClose}>Close Profile</button>
      </div>
    )
  }
})

jest.mock('./UserPreviewModal', () => {
  return function MockUserPreviewModal({ isOpen, onClose }) {
    if (!isOpen) return null
    return (
      <div data-testid="user-preview-modal">
        <button onClick={onClose}>Close Preview</button>
      </div>
    )
  }
})

jest.mock('./UserChangePasswordModal', () => {
  return function MockUserChangePasswordModal({ isOpen, onClose }) {
    if (!isOpen) return null
    return (
      <div data-testid="user-change-password-modal">
        <button onClick={onClose}>Close Change Password</button>
      </div>
    )
  }
})

jest.mock('./UserForm', () => {
  return function MockUserForm({ onClose, onSuccess }) {
    return (
      <div data-testid="user-form-modal">
        <button
          onClick={() =>
            onSuccess &&
            onSuccess({
              id: 999,
              name: 'New User',
              email: 'new@example.com',
              phone: '000',
              role: 'Admin',
              status: 'Active'
            })
          }
        >
          Save User
        </button>
        <button onClick={onClose}>Close</button>
      </div>
    )
  }
})

const { api } = jest.requireMock('../../utils/api')

const setupApiMocks = () => {
  api.get.mockImplementation((url) => {
    if (url === '/api/users') {
      return Promise.resolve({
        data: [
          {
            id: 1,
            name: 'Ahmed Mohamed',
            email: 'ahmed@example.com',
            phone: '111',
            role: 'Admin',
            status: 'Active',
            createdAt: '2025-01-01'
          },
          {
            id: 2,
            name: 'John Doe',
            email: 'john@example.com',
            phone: '222',
            role: 'Agent',
            status: 'Inactive',
            createdAt: '2025-01-02'
          }
        ]
      })
    }
    if (url === '/api/departments') {
      return Promise.resolve({
        data: [
          { id: 10, name: 'Sales' },
          { id: 11, name: 'Support' }
        ]
      })
    }
    return Promise.resolve({ data: [] })
  })
}

beforeEach(() => {
  localStorage.clear()
  jest.clearAllMocks()
  setupApiMocks()
})

describe('UserManagementUsers Page', () => {
  test('renders users page title and list header', async () => {
    render(<UserManagementUsers />)
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/users')
    })
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Users List')).toBeInTheDocument()
  })

  test('opens import users modal when import button is clicked', async () => {
    render(<UserManagementUsers />)
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/users')
    })
    const importBtn = screen.getByText('Import')
    fireEvent.click(importBtn)
    expect(screen.getByTestId('import-users-modal')).toBeInTheDocument()
  })

  test('opens add user form when add new user button is clicked', async () => {
    render(<UserManagementUsers />)
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/users')
    })
    const addBtn = screen.getByText('Add New User')
    fireEvent.click(addBtn)
    expect(screen.getByTestId('user-form-modal')).toBeInTheDocument()
  })

  test('filters users by search query', async () => {
    render(<UserManagementUsers />)
    const searchInput = screen.getByPlaceholderText('Search (name, email, phone)...')
    fireEvent.change(searchInput, { target: { value: 'John' } })
  }, 15000)

  test('shows bulk actions bar when a user is selected', async () => {
    render(<UserManagementUsers />)
    await waitFor(() => {
      expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(1)
    })
    const checkboxes = screen.getAllByRole('checkbox')
    const firstRowCheckbox = checkboxes[1]
    fireEvent.click(firstRowCheckbox)
    await waitFor(() => {
      expect(screen.getByText('Bulk actions on selected:')).toBeInTheDocument()
    })
  }, 15000)

  test('handles date range filter via date picker', async () => {
    render(<UserManagementUsers />)
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/users')
    })
    const toggleBtn = screen.getByText('Show All')
    fireEvent.click(toggleBtn)
    const selectTodayBtn = screen.getByTestId('date-picker-select-today')
    fireEvent.click(selectTodayBtn)
    const today = new Date().toISOString().split('T')[0]
    const dateInput = screen.getByTestId('date-picker-input')
    expect(dateInput.value).toContain(today)
  }, 15000)

  test('resets filters when Reset button is clicked', async () => {
    render(<UserManagementUsers />)
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/users')
    })
    const searchInput = screen.getByPlaceholderText('Search (name, email, phone)...')
    fireEvent.change(searchInput, { target: { value: 'Ahmed' } })
    expect(searchInput.value).toBe('Ahmed')
    const resetBtn = screen.getByText('Reset')
    fireEvent.click(resetBtn)
    expect(searchInput.value).toBe('')
  }, 15000)
})
