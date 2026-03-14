import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './Login';
import { useAppState } from '@shared/context/AppStateProvider';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/context/ThemeProvider';

// Mock dependencies
jest.mock('@shared/context/AppStateProvider');
jest.mock('react-router-dom', () => ({
  useNavigate: jest.fn(),
  Link: ({ children }) => <a>{children}</a>,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue || key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));
jest.mock('@shared/context/ThemeProvider', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));
jest.mock('@utils/api', () => ({
  api: {
    post: jest.fn(),
  },
}));

describe('Login Component', () => {
  const mockLogin = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    useAppState.mockReturnValue({
      login: mockLogin,
      user: null,
      bootstrapped: true,
    });
    useNavigate.mockReturnValue(mockNavigate);
    mockLogin.mockClear();
    mockNavigate.mockClear();
  });

  test('redirects super admin to system dashboard', async () => {
    // Mock login success for super admin
    mockLogin.mockResolvedValue({
      user: { is_super_admin: true },
      subscription_plan: 'super_admin',
    });

    render(<Login />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    fireEvent.change(emailInput, { target: { value: 'admin@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@example.com', 'password', null, false);
      expect(mockNavigate).toHaveBeenCalledWith('/system/dashboard', { replace: true });
    });
  });

  test('redirects regular user to dashboard', async () => {
    // Mock login success for regular user
    mockLogin.mockResolvedValue({
      user: { is_super_admin: false },
      subscription_plan: 'basic',
    });

    render(<Login />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitButton = screen.getByRole('button', { name: /Sign in/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard'); // fallback logic
    });
  });
});
