import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ToothLogo from '../components/ToothLogo'

const ResetPassword = () => {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const [sessionReady, setSessionReady] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        // Supabase sends a RECOVERY event when the user clicks the reset link
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event) => {
                if (event === 'PASSWORD_RECOVERY') {
                    setSessionReady(true)
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.')
            return
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.')
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error
            setSuccess(true)
            setTimeout(() => navigate('/login'), 3000)
        } catch (err) {
            setError(err.message || 'Error al actualizar la contraseña.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-pastel-light px-4">
            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                        <ToothLogo className="w-16 h-16" />
                    </div>
                    <h1 className="text-3xl font-bold text-dark tracking-tight">DentApp</h1>
                    <p className="text-dark/50 text-sm mt-1">Restablecer contraseña</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-pastel p-8">
                    {success ? (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-dark mb-2">¡Contraseña actualizada!</h2>
                            <p className="text-dark/50 text-sm">
                                Redirigiendo al login en unos segundos...
                            </p>
                        </div>
                    ) : !sessionReady ? (
                        <div className="text-center">
                            <div className="w-10 h-10 mx-auto mb-4 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                            <p className="text-dark/50 text-sm">Verificando enlace de recuperación...</p>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-semibold text-dark mb-2">Nueva contraseña</h2>
                            <p className="text-dark/50 text-sm mb-6">
                                Ingresá tu nueva contraseña para restablecer el acceso.
                            </p>

                            {error && (
                                <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-dark/70 mb-1.5">
                                        Nueva contraseña
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-soft bg-gray-soft/50
                               text-dark placeholder:text-dark/30
                               focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                               transition-all duration-200"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-dark/70 mb-1.5">
                                        Confirmar contraseña
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        placeholder="Repetí tu contraseña"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-soft bg-gray-soft/50
                               text-dark placeholder:text-dark/30
                               focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                               transition-all duration-200"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-2.5 px-4 rounded-xl bg-accent text-dark font-semibold
                             hover:bg-accent-hover active:scale-[0.98]
                             focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2
                             disabled:opacity-60 disabled:cursor-not-allowed
                             transition-all duration-200 cursor-pointer"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="w-4 h-4 border-2 border-dark/30 border-t-dark rounded-full animate-spin" />
                                            Guardando...
                                        </span>
                                    ) : (
                                        'Guardar nueva contraseña'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ResetPassword
