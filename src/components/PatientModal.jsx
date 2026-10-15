import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const emptyForm = {
    first_name: '',
    last_name: '',
    dni: '',
    birth_date: '',
    email: '',
    phone: '',
    obra_social: '',
    observations: '',
    clinic_id: '',
}

const PatientModal = ({ isOpen, onClose, onSaved, patient = null }) => {
    const { user } = useAuth()
    const [form, setForm] = useState(emptyForm)
    const [clinics, setClinics] = useState([])
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')

    const isEdit = Boolean(patient)

    // Load clinics for dropdown
    useEffect(() => {
        if (!isOpen) return
        const fetchClinics = async () => {
            const { data } = await supabase
                .from('doctor_clinics')
                .select('clinic_id, clinics(id, name)')
                .eq('doctor_id', user.id)
            if (data) {
                setClinics(data.map((dc) => dc.clinics))
            }
        }
        fetchClinics()
    }, [isOpen, user.id])

    // Pre-fill on edit
    useEffect(() => {
        if (isOpen && patient) {
            setForm({
                first_name: patient.first_name || '',
                last_name: patient.last_name || '',
                dni: patient.dni || '',
                birth_date: patient.birth_date || '',
                email: patient.email || '',
                phone: patient.phone || '',
                obra_social: patient.obra_social || '',
                observations: patient.observations || '',
                clinic_id: patient.clinic_id || '',
            })
        } else if (isOpen) {
            setForm(emptyForm)
        }
        setErrors({})
        setApiError('')
    }, [isOpen, patient])

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    }

    const validate = () => {
        const newErrors = {}
        if (!form.first_name.trim()) newErrors.first_name = 'Requerido'
        if (!form.last_name.trim()) newErrors.last_name = 'Requerido'
        if (!form.dni.trim()) newErrors.dni = 'Requerido'
        if (!form.birth_date) newErrors.birth_date = 'Requerido'
        if (!form.clinic_id) newErrors.clinic_id = 'Seleccioná una clínica'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)
        setApiError('')

        try {
            const payload = {
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                dni: form.dni.trim(),
                birth_date: form.birth_date,
                email: form.email.trim() || null,
                phone: form.phone.trim() || null,
                obra_social: form.obra_social.trim() || null,
                observations: form.observations.trim() || null,
                clinic_id: form.clinic_id,
            }

            if (isEdit) {
                const { error } = await supabase
                    .from('patients')
                    .update(payload)
                    .eq('id', patient.id)
                if (error) throw error
            } else {
                payload.created_by = user.id
                const { error } = await supabase.from('patients').insert(payload)
                if (error) throw error
            }

            onSaved()
            onClose()
        } catch (err) {
            setApiError(err.message || 'Error al guardar el paciente.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const inputClass = (field) =>
        `w-full px-3 py-2 rounded-xl border text-sm text-dark placeholder:text-dark/30
     focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200
     ${errors[field] ? 'border-error bg-error/5' : 'border-gray-soft bg-gray-soft/50'}`

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-dark/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 my-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-dark">
                        {isEdit ? 'Editar paciente' : 'Nuevo paciente'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-soft text-dark/40 hover:text-dark transition-colors cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {apiError && (
                    <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                        {apiError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Row: first_name + last_name */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-dark/60 mb-1">Nombre *</label>
                            <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="Juan" className={inputClass('first_name')} />
                            {errors.first_name && <p className="text-xs text-error mt-1">{errors.first_name}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-dark/60 mb-1">Apellido *</label>
                            <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Pérez" className={inputClass('last_name')} />
                            {errors.last_name && <p className="text-xs text-error mt-1">{errors.last_name}</p>}
                        </div>
                    </div>

                    {/* Row: DNI + birth_date */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-dark/60 mb-1">DNI *</label>
                            <input name="dni" value={form.dni} onChange={handleChange} placeholder="12345678" className={inputClass('dni')} />
                            {errors.dni && <p className="text-xs text-error mt-1">{errors.dni}</p>}
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-dark/60 mb-1">Fecha de nacimiento *</label>
                            <input name="birth_date" type="date" value={form.birth_date} onChange={handleChange} className={inputClass('birth_date')} />
                            {errors.birth_date && <p className="text-xs text-error mt-1">{errors.birth_date}</p>}
                        </div>
                    </div>

                    {/* Row: email + phone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-dark/60 mb-1">Email</label>
                            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@ejemplo.com" className={inputClass('email')} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-dark/60 mb-1">Teléfono</label>
                            <input name="phone" value={form.phone} onChange={handleChange} placeholder="+54 11 1234-5678" className={inputClass('phone')} />
                        </div>
                    </div>

                    {/* Obra social */}
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1">Obra social</label>
                        <input name="obra_social" value={form.obra_social} onChange={handleChange} placeholder="OSDE, Swiss Medical, etc." className={inputClass('obra_social')} />
                    </div>

                    {/* Clinic */}
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1">Clínica *</label>
                        <select
                            name="clinic_id"
                            value={form.clinic_id}
                            onChange={handleChange}
                            className={inputClass('clinic_id')}
                        >
                            <option value="">Seleccionar clínica...</option>
                            {clinics.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {errors.clinic_id && <p className="text-xs text-error mt-1">{errors.clinic_id}</p>}
                    </div>

                    {/* Observations */}
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1">Observaciones</label>
                        <textarea
                            name="observations"
                            value={form.observations}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Notas adicionales..."
                            className={`${inputClass('observations')} resize-none`}
                        />
                    </div>

                    {/* Actions */}
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
                            ) : isEdit ? 'Guardar cambios' : 'Crear paciente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default PatientModal
