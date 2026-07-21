import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Demo-only auth. A single hardcoded credential gates the app; there is no
 * backend. Session lives in sessionStorage so it survives reloads within the
 * tab and clears when the tab closes — mirroring the app store's persistence.
 */
const DEMO_CREDENTIALS = { username: 'testuser', password: 'testpass' } as const

interface AuthState {
  /** Signed-in username, or null when logged out. */
  user: string | null
  /** Returns true on success (and sets `user`), false on bad credentials. */
  login: (username: string, password: string) => boolean
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (username, password) => {
        if (username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
          set({ user: username })
          return true
        }
        return false
      },
      logout: () => set({ user: null }),
    }),
    {
      name: 'ledgerline-auth',
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
    },
  ),
)
