import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthUser, Role } from '../types'

interface AuthContextType {
  user: AuthUser
  previewRole: Role
  setPreviewRole: (role: Role) => void
}

const DEFAULT_USER: AuthUser = {
  id: 1,
  name: 'Factory Admin',
  email: 'admin@forge2iq.com',
  role: 'COMPANY_ADMIN',
  companyId: 1,
  companyName: 'Forge2IQ',
  token: '',
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [previewRole, setPreviewRole] = useState<Role>('PRINTING_MANAGER')

  return (
    <AuthContext.Provider value={{ user: DEFAULT_USER, previewRole, setPreviewRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
