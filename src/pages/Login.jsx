import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { translateError } from '../lib/translateError'
import ToothLogo from '../components/ToothLogo'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await login(email, password)
            navigate('/home')
        } catch (err) {
            setError(translateError(err))
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
                    <p className="text-dark/50 text-sm mt-1">Gestión odontológica simplificada</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-pastel p-8">
                    <h2 className="text-xl font-semibold text-dark mb-6">Iniciar sesión</h2>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-dark/70 mb-1.5">
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-soft bg-gray-soft/50
                           text-dark placeholder:text-dark/30
                           focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                           transition-all duration-200"
                            />
                        </div>

                        <div className="flex justify-end">
                            <Link
                                to="/forgot-password"
                                className="text-sm text-dark/50 hover:text-accent transition-colors duration-200"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
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
                                    Ingresando...
                                </span>
                            ) : (
                                'Iniciar sesión'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer link */}
                <p className="text-center text-sm text-dark/50 mt-6">
                    ¿No tenés una cuenta?{' '}
                    <Link
                        to="/register"
                        className="text-dark font-medium hover:text-accent transition-colors duration-200"
                    >
                        Registrate
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default Login
