import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ClinicModal = ({ isOpen, onClose, onSaved }) => {
    const { user } = useAuth()
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            setName('')
            setError('')
        }
    }, [isOpen])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name.trim()) {
            setError('El nombre de la clínica es requerido')
            return
        }

        setLoading(true)
        setError('')

        try {
            // 1. Insert clinic
            const { data: clinic, error: clinicErr } = await supabase
                .from('clinics')
                .insert({ 
                    name: name.trim() // If this fails, maybe it expects doctor_id too. Wait, if it expects doctor_id, let me pass it. But I also need to pass user_id?
                    // Let's pass user_id just in case, but many schemas don't have it on `clinics` if it's mapped via `doctor_clinics`.
                    // Actually, let's just create a test page that tells us the schema.
                })

            if (clinicErr) throw clinicErr

            // 2. Link to doctor
            const { error: linkErr } = await supabase
                .from('doctor_clinics')
                .insert({
                    doctor_id: user.id,
                    clinic_id: clinic.id
                })

            if (linkErr) throw linkErr

            onSaved()
            onClose()
        } catch (err) {
            console.error(err)
            setError(err.message || 'Error al guardar la clínica.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-dark/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-dark">Nueva clínica</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-soft text-dark/40 hover:text-dark transition-colors cursor-pointer">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1">Nombre de la clínica *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Consultorio Centro"
                            autoFocus
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-soft bg-gray-soft/50 text-sm text-dark placeholder:text-dark/30
                               focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-soft text-sm font-medium
                         text-dark/70 hover:bg-gray-soft transition-all duration-200 cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-accent text-dark text-sm font-semibold
                         hover:bg-accent-hover active:scale-[0.98]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-200 cursor-pointer"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-dark/30 border-t-dark rounded-full animate-spin" />
                                    Guardando...
                                </span>
                            ) : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ClinicModal
