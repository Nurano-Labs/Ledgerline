import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import './index.css'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { People } from './pages/People'
import { EmployeeProfile } from './pages/EmployeeProfile'
import { OnboardingWizard } from './pages/OnboardingWizard'
import { Payroll } from './pages/Payroll'
import { PayrollRunWizard } from './pages/PayrollRunWizard'
import { TimeOff } from './pages/TimeOff'
import { Benefits } from './pages/Benefits'
import { Reports } from './pages/Reports'
import { SettingsCompany } from './pages/SettingsCompany'

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'people', element: <People /> },
          { path: 'people/new', element: <OnboardingWizard /> },
          { path: 'people/:id', element: <EmployeeProfile /> },
          { path: 'payroll', element: <Payroll /> },
          { path: 'payroll/run', element: <PayrollRunWizard /> },
          { path: 'time-off', element: <TimeOff /> },
          { path: 'benefits', element: <Benefits /> },
          { path: 'reports', element: <Reports /> },
          { path: 'settings/company', element: <SettingsCompany /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
