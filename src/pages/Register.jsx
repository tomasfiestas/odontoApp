import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { translateError } from '../lib/translateError'
import ToothLogo from '../components/ToothLogo'

const Register = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const { register } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden.')
            return
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.')
            return
        }

        setLoading(true)

        try {
            await register(formData.email, formData.password, {
                full_name: formData.fullName,
            })
            setSuccess(true)
        } catch (err) {
            setError(translateError(err))
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-pastel-light px-4">
                <div className="w-full max-w-md">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                            <ToothLogo className="w-16 h-16" />
                        </div>
                        <h1 className="text-3xl font-bold text-dark tracking-tight">DentApp</h1>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-pastel p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-dark mb-2">¡Cuenta creada!</h2>
                        <p className="text-dark/50 text-sm mb-6">
                            Te enviamos un correo de confirmación. Revisá tu bandeja de entrada para activar tu cuenta.
                        </p>
                        <Link
                            to="/login"
                            className="inline-block py-2.5 px-6 rounded-xl bg-accent text-dark font-semibold
                         hover:bg-accent-hover transition-all duration-200"
                        >
                            Ir a iniciar sesión
                        </Link>
                    </div>
                </div>
            </div>
        )
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
                    <p className="text-dark/50 text-sm mt-1">Crear una cuenta nueva</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-pastel p-8">
                    <h2 className="text-xl font-semibold text-dark mb-6">Registro</h2>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-dark/70 mb-1.5">
                                Nombre completo
                            </label>
                            <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                placeholder="Dr. Juan Pérez"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-soft bg-gray-soft/50
                           text-dark placeholder:text-dark/30
                           focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                           transition-all duration-200"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-dark/70 mb-1.5">
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="doctor@email.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-soft bg-gray-soft/50
                           text-dark placeholder:text-dark/30
                           focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                           transition-all duration-200"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-dark/70 mb-1.5">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
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
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
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
                                    Registrando...
                                </span>
                            ) : (
                                'Crear cuenta'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer link */}
                <p className="text-center text-sm text-dark/50 mt-6">
                    ¿Ya tenés una cuenta?{' '}
                    <Link
                        to="/login"
                        className="text-dark font-medium hover:text-accent transition-colors duration-200"
                    >
                        Iniciá sesión
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default Register
