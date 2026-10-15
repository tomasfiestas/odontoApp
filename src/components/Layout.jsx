import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ToothLogo from './ToothLogo'
import AppointmentModal from './AppointmentModal'

const navItems = [
    {
        to: '/home',
        label: 'Inicio',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-4 0h4" />
            </svg>
        ),
    },
    {
        to: '/calendar',
        label: 'Calendario',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        to: '/patients',
        label: 'Pacientes',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        to: '/clinics',
        label: 'Clínicas',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
    },
    {
        to: '/billing',
        label: 'Cobros',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        to: '/settings',
        label: 'Ajustes',
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
]

const Layout = () => {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [loggingOut, setLoggingOut] = useState(false)
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false)

    const userName = user?.user_metadata?.full_name || user?.email || ''

    const handleLogout = async () => {
        setLoggingOut(true)
        try {
            await logout()
            navigate('/login')
        } catch (error) {
            console.error('Error al cerrar sesión:', error)
        } finally {
            setLoggingOut(false)
        }
    }

    return (
        <div className="min-h-screen bg-pastel-light flex">
            {/* ── Desktop Sidebar ── */}
            <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-pastel fixed inset-y-0 left-0 z-30">
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 h-16 border-b border-pastel">
                    <ToothLogo className="w-8 h-8" />
                    <span className="text-xl font-bold text-dark tracking-tight">DentApp</span>
                </div>

                {/* Nav Links */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {/* Nuevo Turno Desktop */}
                    <button
                        onClick={() => setIsAppointmentModalOpen(true)}
                        className="w-full mb-4 flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-accent text-dark font-semibold shadow-sm hover:bg-accent-hover hover:shadow-md transition-all duration-200 cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo Turno
                    </button>

                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-accent text-dark'
                                    : 'text-dark/60 hover:bg-pastel hover:text-dark'
                                }`
                            }
                        >
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User & Logout */}
                <div className="border-t border-pastel p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-semibold text-dark">
                            {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-dark truncate">{userName}</p>
                            <p className="text-xs text-dark/40 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium
                       text-dark/60 rounded-xl hover:bg-red-50 hover:text-red-600
                       transition-all duration-200 cursor-pointer disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <div className="flex-1 md:ml-64 pb-20 md:pb-0">
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Outlet />
                </main>
            </div>

            {/* ── Mobile Bottom Navigation ── */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-pastel z-30 safe-area-bottom">
                <div className="flex items-center justify-between px-1 h-16">
                    {navItems.slice(0, 3).map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 min-w-[3rem] ${isActive
                                    ? 'text-accent'
                                    : 'text-dark/40'
                                }`
                            }
                        >
                            <div className="scale-90">{item.icon}</div>
                            <span className="text-[9px] font-medium hidden sm:block">{item.label}</span>
                        </NavLink>
                    ))}

                    {/* FAB Center */}
                    <div className="relative -top-5 px-1">
                        <button
                            onClick={() => setIsAppointmentModalOpen(true)}
                            className="w-12 h-12 bg-accent rounded-full shadow-lg flex items-center justify-center text-dark hover:bg-accent-hover active:scale-95 transition-all duration-200 cursor-pointer border-4 border-white"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>

                    {navItems.slice(3).map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 min-w-[3rem] ${isActive
                                    ? 'text-accent'
                                    : 'text-dark/40'
                                }`
                            }
                        >
                            <div className="scale-90">{item.icon}</div>
                            <span className="text-[9px] font-medium hidden sm:block">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* Global Appointment Modal */}
            <AppointmentModal
                isOpen={isAppointmentModalOpen}
                onClose={() => setIsAppointmentModalOpen(false)}
                onSaved={() => {
                    // This could be enhanced to refresh data globally if needed,
                    // but since queries fetch on mount, it's generally okay. 
                    // Navigating or triggering a context refresh would go here.
                }}
            />
        </div>
    )
}

export default Layout
