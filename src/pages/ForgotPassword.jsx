import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { translateError } from '../lib/translateError'
import ToothLogo from '../components/ToothLogo'

const ForgotPassword = () => {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const { resetPassword } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await resetPassword(email)
            setSuccess(true)
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
                    <p className="text-dark/50 text-sm mt-1">Recuperar contraseña</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-pastel p-8">
                    {success ? (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-dark mb-2">¡Correo enviado!</h2>
                            <p className="text-dark/50 text-sm mb-6">
                                Si la dirección existe en nuestro sistema, recibirás un correo con las instrucciones para restablecer tu contraseña.
                            </p>
                            <Link
                                to="/login"
                                className="inline-block py-2.5 px-6 rounded-xl bg-accent text-dark font-semibold
                           hover:bg-accent-hover transition-all duration-200"
                            >
                                Volver al login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-semibold text-dark mb-2">¿Olvidaste tu contraseña?</h2>
                            <p className="text-dark/50 text-sm mb-6">
                                Ingresá tu correo electrónico y te enviaremos un enlace para restablecerla.
                            </p>

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
                                            Enviando...
                                        </span>
                                    ) : (
                                        'Enviar enlace de recuperación'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {/* Footer link */}
                <p className="text-center text-sm text-dark/50 mt-6">
                    <Link
                        to="/login"
                        className="text-dark font-medium hover:text-accent transition-colors duration-200"
                    >
                        ← Volver al login
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default ForgotPassword
