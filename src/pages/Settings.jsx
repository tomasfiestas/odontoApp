import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { SkeletonList } from '../components/Skeleton'

const Settings = () => {
    const { user } = useAuth()
    const { showToast } = useToast()
    
    const [activeTab, setActiveTab] = useState('profile')
    const [loadingInit, setLoadingInit] = useState(true)

    // Profile State
    const [profileForm, setProfileForm] = useState({ full_name: '', role: '' })
    const [savingProfile, setSavingProfile] = useState(false)

    // Password State
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' })
    const [savingPassword, setSavingPassword] = useState(false)

    // Preferences State
    const [emailReminders, setEmailReminders] = useState(false)
    const [daysAdvance, setDaysAdvance] = useState(2)
    const [savingPref, setSavingPref] = useState(false)

    useEffect(() => {
        const fetchProfile = async () => {
            setLoadingInit(true)
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('full_name, role, email_reminders, reminder_days_advance')
                    .eq('id', user.id)
                    .single()
                
                if (error) throw error
                if (data) {
                    setProfileForm({ full_name: data.full_name || '', role: data.role || 'doctor' })
                    // Cargar preferencias de BD
                    setEmailReminders(data.email_reminders ?? true)
                    setDaysAdvance(data.reminder_days_advance ?? 2)
                }
            } catch (error) {
                showToast('Error al cargar perfil', 'error')
            } finally {
                setLoadingInit(false)
            }
        }

        fetchProfile()
    }, [user.id, showToast])

    const handleProfileSubmit = async (e) => {
        e.preventDefault()
        if (!profileForm.full_name.trim()) {
            showToast('El nombre completo es requerido', 'error')
            return
        }

        setSavingProfile(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ full_name: profileForm.full_name.trim() })
                .eq('id', user.id)

            if (error) throw error
            showToast('Perfil actualizado correctamente', 'success')
        } catch (error) {
            showToast('Error al actualizar perfil', 'error')
        } finally {
            setSavingProfile(false)
        }
    }

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()
        if (passwordForm.newPassword.length < 6) {
            showToast('La contraseña debe tener al menos 6 caracteres', 'error')
            return
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast('Las contraseñas no coinciden', 'error')
            return
        }

        setSavingPassword(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordForm.newPassword
            })
            if (error) throw error

            showToast('Contraseña actualizada correctamente', 'success')
            setPasswordForm({ newPassword: '', confirmPassword: '' })
        } catch (error) {
            showToast('Error al actualizar contraseña', 'error')
        } finally {
            setSavingPassword(false)
        }
    }

    const savePreferences = async (newEmailReminders = emailReminders, newDaysAdvance = daysAdvance) => {
        setSavingPref(true)
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    email_reminders: newEmailReminders,
                    reminder_days_advance: newDaysAdvance
                })
                .eq('id', user.id)

            if (error) throw error
        } catch (error) {
            console.error(error)
            showToast('Error al guardar preferencias', 'error')
        } finally {
            setSavingPref(false)
        }
    }

    const toggleReminders = async () => {
        const newValue = !emailReminders
        setEmailReminders(newValue)
        await savePreferences(newValue, daysAdvance)
        if (newValue) {
            showToast('Notificaciones activadas', 'success')
        } else {
            showToast('Notificaciones desactivadas', 'info')
        }
    }

    const handleDaysAdvanceChange = async (e) => {
        const val = parseInt(e.target.value) || 1
        setDaysAdvance(val)
        // Auto-save on blur instead of every keystroke could be better,
        // but for simplicity we save on change since it's a number dropdown or input
    }
    
    const handleDaysAdvanceBlur = async () => {
        await savePreferences(emailReminders, daysAdvance)
        showToast('Preferencias guardadas', 'success')
    }

    if (loadingInit) {
        return (
            <div>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-dark">Configuración</h1>
                </div>
                <SkeletonList count={3} />
            </div>
        )
    }

    const tabs = [
        { id: 'profile', label: 'Mi Perfil' },
        { id: 'security', label: 'Seguridad' },
        { id: 'preferences', label: 'Preferencias' }
    ]

    return (
        <div className="pb-24 md:pb-4 max-w-4xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-dark">Configuración</h1>
                <p className="text-dark/50 mt-1">Preferencias y ajustes de tu cuenta</p>
            </div>

            {/* Desktop layout: Sidebar + Content */}
            <div className="flex flex-col md:flex-row gap-8">
                
                {/* Tabs Sidebar */}
                <div className="md:w-64 shrink-0">
                    <div className="flex justify-between md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 md:flex-none text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                                    ${activeTab === tab.id 
                                        ? 'bg-accent text-dark shadow-sm' 
                                        : 'text-dark/60 hover:bg-gray-soft/50 hover:text-dark'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1">
                    
                    {/* TAB: PROFILE */}
                    {activeTab === 'profile' && (
                        <div className="bg-white rounded-2xl border border-pastel p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-dark mb-6">Datos Personales</h2>
                            
                            <form onSubmit={handleProfileSubmit} className="space-y-5 max-w-md">
                                <div>
                                    <label className="block text-sm font-medium text-dark/70 mb-1.5">Nombre Completo</label>
                                    <input 
                                        type="text"
                                        value={profileForm.full_name}
                                        onChange={e => setProfileForm(prev => ({...prev, full_name: e.target.value}))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-pastel bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                                        placeholder="Ej: Dr. Juan Pérez"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-dark/70 mb-1.5">Rol en la App</label>
                                    <input 
                                        type="text"
                                        value={profileForm.role === 'admin' ? 'Administrador' : 'Doctor / Profesional'}
                                        disabled
                                        className="w-full px-4 py-2.5 rounded-xl border border-pastel bg-gray-soft/40 text-dark/50 cursor-not-allowed uppercase text-xs font-bold tracking-wider"
                                    />
                                    <p className="text-xs text-dark/40 mt-1.5">El rol actual no puede modificarse desde aquí.</p>
                                </div>
                                
                                <div className="pt-4">
                                    <button 
                                        type="submit" 
                                        disabled={savingProfile || !profileForm.full_name.trim()}
                                        className="px-6 py-2.5 bg-accent text-dark rounded-xl font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
                                    >
                                        {savingProfile ? 'Guardando...' : 'Guardar cambios'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* TAB: SECURITY */}
                    {activeTab === 'security' && (
                        <div className="bg-white rounded-2xl border border-pastel p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-dark mb-6">Seguridad</h2>
                            
                            <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-md">
                                <div>
                                    <label className="block text-sm font-medium text-dark/70 mb-1.5">Nueva Contraseña</label>
                                    <input 
                                        type="password"
                                        value={passwordForm.newPassword}
                                        onChange={e => setPasswordForm(prev => ({...prev, newPassword: e.target.value}))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-pastel bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-dark/70 mb-1.5">Confirmar Contraseña</label>
                                    <input 
                                        type="password"
                                        value={passwordForm.confirmPassword}
                                        onChange={e => setPasswordForm(prev => ({...prev, confirmPassword: e.target.value}))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-pastel bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                                        placeholder="Repetir contraseña"
                                    />
                                </div>
                                
                                <div className="pt-4">
                                    <button 
                                        type="submit" 
                                        disabled={savingPassword || !passwordForm.newPassword}
                                        className="px-6 py-2.5 bg-dark text-white rounded-xl font-semibold hover:bg-dark/90 transition-colors disabled:opacity-50"
                                    >
                                        {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* TAB: PREFERENCES */}
                    {activeTab === 'preferences' && (
                        <div className="bg-white rounded-2xl border border-pastel p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-dark mb-6">Preferencias del Sistema</h2>
                            
                            <div className="space-y-6 max-w-xl">
                                
                                {/* Reminder Toggle */}
                                <div className="flex flex-col gap-4 p-4 rounded-xl border border-pastel bg-pastel-light/10">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-semibold text-dark text-base">Alertas Automáticas de Turnos</h3>
                                            <p className="text-sm text-dark/60 mt-1">
                                                Envía un correo automático a los pacientes para solicitar confirmación o cancelación.
                                            </p>
                                        </div>
                                        <div className="shrink-0 pt-1">
                                            <button 
                                                onClick={toggleReminders}
                                                disabled={savingPref}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${emailReminders ? 'bg-success' : 'bg-gray-soft/80'} ${savingPref ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                role="switch"
                                                aria-checked={emailReminders}
                                            >
                                                <span 
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${emailReminders ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {emailReminders && (
                                        <div className="pt-3 border-t border-pastel/50 mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <label className="text-sm font-medium text-dark/80">
                                                ¿Con cuántos días de anticipación enviar el correo?
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number"
                                                    min="1"
                                                    max="14"
                                                    value={daysAdvance}
                                                    onChange={handleDaysAdvanceChange}
                                                    onBlur={handleDaysAdvanceBlur}
                                                    className="w-20 px-3 py-1.5 text-center rounded-xl border border-pastel bg-white focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                                                />
                                                <span className="text-sm text-dark/60">días</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    )}
                    
                </div>
            </div>
        </div>
    )
}

export default Settings
