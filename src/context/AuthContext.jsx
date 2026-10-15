import { createContext, useContext, useReducer, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const initialState = {
    user: null,
    loading: true,
}

function authReducer(state, action) {
    switch (action.type) {
        case 'SET_USER':
            return { ...state, user: action.payload, loading: false }
        case 'LOGOUT':
            return { ...state, user: null, loading: false }
        case 'LOADING':
            return { ...state, loading: true }
        case 'STOP_LOADING':
            return { ...state, loading: false }
        default:
            return state
    }
}

export function AuthProvider({ children }) {
    const [state, dispatch] = useReducer(authReducer, initialState)

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            dispatch({ type: 'SET_USER', payload: session?.user ?? null })
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                dispatch({ type: 'SET_USER', payload: session?.user ?? null })
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const login = async (email, password) => {
        dispatch({ type: 'LOADING' })
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) {
            dispatch({ type: 'STOP_LOADING' })
            throw error
        }
        return data
    }

    const register = async (email, password, metadata = {}) => {
        dispatch({ type: 'LOADING' })
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata },
        })
        if (error) {
            dispatch({ type: 'STOP_LOADING' })
            throw error
        }
        return data
    }

    const logout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        dispatch({ type: 'LOGOUT' })
    }

    const resetPassword = async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        if (error) throw error
        return data
    }

    const value = {
        user: state.user,
        loading: state.loading,
        login,
        register,
        logout,
        resetPassword,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
