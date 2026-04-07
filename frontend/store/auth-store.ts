import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types/profile'
import { fetchProfileByUserId } from '@/lib/repositories/profiles'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  initialized: boolean
  
  // Actions
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>
  fetchProfile: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: false,
  initialized: false,

  signIn: async (email: string, password: string) => {
    set({ loading: true })
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      set({ loading: false })
      return { error }
    }

    if (data.user && data.session) {
      set({ 
        user: data.user, 
        session: data.session,
        loading: false 
      })
      await get().fetchProfile()
    }

    return { error: null }
  },

  signUp: async (email: string, password: string, name: string) => {
    set({ loading: true })
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (error) {
      set({ loading: false })
      return { error }
    }

    if (data.user && data.session) {
      set({ 
        user: data.user, 
        session: data.session,
        loading: false 
      })
      await get().fetchProfile()
    }

    return { error: null }
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ 
      user: null, 
      session: null, 
      profile: null 
    })
  },

  resetPassword: async (email: string) => {
    set({ loading: true })
    const supabase = createClient()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    set({ loading: false })
    return { error }
  },

  updatePassword: async (newPassword: string) => {
    set({ loading: true })
    const supabase = createClient()
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    set({ loading: false })
    return { error }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    set({ loading: true })

    if (!get().user) {
      set({ loading: false })
      return { error: new Error('Not authenticated') }
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const json = (await res.json().catch(() => ({}))) as {
        error?: string
        profile?: Profile
      }

      if (!res.ok) {
        set({ loading: false })
        return { error: new Error(json.error ?? `Request failed (${res.status})`) }
      }

      if (json.profile) {
        set({ profile: json.profile, loading: false })
      } else {
        await get().fetchProfile()
        set({ loading: false })
      }

      return { error: null }
    } catch (err) {
      set({ loading: false })
      return { error: err instanceof Error ? err : new Error('Network error') }
    }
  },

  fetchProfile: async () => {
    const supabase = createClient()
    const { user } = get()

    if (!user) {
      set({ profile: null })
      return
    }

    const { data, error } = await fetchProfileByUserId(supabase, user.id)

    if (!error && data) {
      set({ profile: data })
    }
  },

  initialize: async () => {
    if (get().initialized) return

    set({ loading: true })
    const supabase = createClient()

    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      set({ 
        user: session.user, 
        session,
        initialized: true,
        loading: false 
      })
      await get().fetchProfile()
    } else {
      set({ 
        initialized: true,
        loading: false 
      })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        set({ user: session.user, session })
        await get().fetchProfile()
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, session: null, profile: null })
      }
    })
  },
}))

export type { Profile } from '@/lib/types/profile'
