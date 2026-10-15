import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const showToast = useCallback((message, type = 'info') => {
        const id = ++toastId
        setToasts((prev) => [...prev, { id, message, type, exiting: false }])

        // Start exit animation after 2.7s, remove after 3s
        setTimeout(() => {
            setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
        }, 2700)
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 3000)
    }, [])

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 300)
    }, [])

    const typeStyles = {
        success: 'bg-success text-white',
        error: 'bg-error text-white',
        info: 'bg-accent text-dark',
    }

    const typeIcons = {
        success: (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast container */}
            <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        onClick={() => dismiss(toast.id)}
                        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium cursor-pointer
                        transition-all duration-300
                        ${typeStyles[toast.type] || typeStyles.info}
                        ${toast.exiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0 animate-in'}`}
                    >
                        {typeIcons[toast.type]}
                        <span className="flex-1">{toast.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
