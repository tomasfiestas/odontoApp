import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const AppointmentModal = ({ isOpen, onClose, onSaved, defaultDate = '', defaultPatient = null }) => {
    const { user } = useAuth()
    const [patients, setPatients] = useState([])
    const [clinics, setClinics] = useState([])
    const [searchPatient, setSearchPatient] = useState('')
    const [form, setForm] = useState({
        patient_id: '',
        clinic_id: '',
        date: defaultDate,
        time: '',
        treatment: '',
        notes: '',
    })
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')
    
    // Smart Scheduler State
    const [bookedTimes, setBookedTimes] = useState([])
    const [loadingTimes, setLoadingTimes] = useState(false)

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            setForm({
                patient_id: defaultPatient ? defaultPatient.id : '',
                clinic_id: '',
                date: defaultDate,
                time: '',
                treatment: '',
                notes: '',
            })
            setSearchPatient(defaultPatient ? `${defaultPatient.last_name}, ${defaultPatient.first_name}` : '')
            setErrors({})
            setApiError('')
        }
    }, [isOpen, defaultDate, defaultPatient])

    // Load clinics
    useEffect(() => {
        if (!isOpen) return
        const fetchClinics = async () => {
            const { data } = await supabase
                .from('doctor_clinics')
                .select('clinic_id, clinics(id, name)')
                .eq('doctor_id', user.id)
            if (data) setClinics(data.map((dc) => dc.clinics))
        }
        fetchClinics()
    }, [isOpen, user.id])

    // Search patients (debounced)
    useEffect(() => {
        if (!isOpen) return
        const fetchPatients = async () => {
            let query = supabase
                .from('patients')
                .select('id, first_name, last_name, dni')
                .order('last_name', { ascending: true })
                .limit(20)

            if (searchPatient.trim()) {
                query = query.ilike('last_name', `%${searchPatient.trim()}%`)
            }

            const { data } = await query
            if (data) setPatients(data)
        }

        const timeout = setTimeout(fetchPatients, 200)
        return () => clearTimeout(timeout)
    }, [isOpen, searchPatient])

    // Fetch availability for Selected Clinic & Date
    useEffect(() => {
        if (!isOpen || !form.date || !form.clinic_id) {
            setBookedTimes([])
            return
        }
        const fetchBookedTimes = async () => {
            setLoadingTimes(true)
            const { data, error } = await supabase
                .from('appointments')
                .select('time')
                .eq('date', form.date)
                .eq('clinic_id', form.clinic_id)
                .eq('doctor_id', user.id)
                .in('status', ['pendiente', 'completado']) // Turnos activos
            
            if (data) {
                // Time from postgres is "HH:mm:ss", we only need "HH:mm"
                const times = data.map(apt => apt.time.slice(0, 5))
                setBookedTimes(times)
                
                // Si el horario clickeado ya no está disponible, lo borramos
                setForm(prev => {
                    if (prev.time && times.includes(prev.time)) {
                        return { ...prev, time: '' }
                    }
                    return prev
                })
            }
            if (error) {
                console.error("Error fetching times:", error)
            }
            setLoadingTimes(false)
        }

        fetchBookedTimes()
    }, [form.date, form.clinic_id, user.id, isOpen])


    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    }

    const selectPatient = (patient) => {
        setForm((prev) => ({ ...prev, patient_id: patient.id }))
        setSearchPatient(`${patient.last_name}, ${patient.first_name}`)
        setPatients([])
        if (errors.patient_id) setErrors((prev) => ({ ...prev, patient_id: '' }))
    }

    const validate = () => {
        const newErrors = {}
        if (!form.patient_id) newErrors.patient_id = 'Seleccioná un paciente'
        if (!form.clinic_id) newErrors.clinic_id = 'Seleccioná una clínica'
        if (!form.date) newErrors.date = 'Requerido'
        if (!form.time) newErrors.time = 'Seleccioná un horario disponible'
        if (!form.treatment.trim()) newErrors.treatment = 'Requerido'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)
        setApiError('')

        try {
            const { error } = await supabase.from('appointments').insert({
                patient_id: form.patient_id,
                clinic_id: form.clinic_id,
                doctor_id: user.id,
                date: form.date,
                time: form.time,
                treatment: form.treatment.trim(),
                notes: form.notes.trim() || null,
                status: 'pendiente',
                source: 'manual',
            })
            if (error) {
                if (error.code === '23505') throw new Error('Ya existe un turno a esa misma hora para esta clínica.')
                throw error
            }

            onSaved()
            onClose()
        } catch (err) {
            setApiError(err.message || 'Error al agendar el turno.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const inputClass = (field) =>
        `w-full px-3 py-2.5 rounded-xl border text-sm text-dark placeholder:text-dark/30
     focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200
     ${errors[field] ? 'border-error bg-error/5' : 'border-gray-soft bg-gray-soft/50'}`

    const selectedPatient = form.patient_id
    const showDropdown = !selectedPatient && searchPatient.trim() && patients.length > 0

    // Generar grilla de horarios: 08:00 a 19:30
    const timeSlots = []
    for (let h = 8; h <= 19; h++) {
        const hh = String(h).padStart(2, '0')
        timeSlots.push(`${hh}:00`, `${hh}:30`)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center md:p-4 md:pt-[5vh] overflow-y-auto">
            <div className="fixed inset-0 bg-dark/40 backdrop-blur-sm hidden md:block" onClick={onClose} />

            <div className="relative bg-white md:rounded-2xl shadow-xl w-full max-w-lg p-6 min-h-screen md:min-h-0 md:my-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-dark">Nuevo turno</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-soft text-dark/40 hover:text-dark transition-colors cursor-pointer">
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
                    {/* Patient search */}
                    <div className="relative">
                        <label className="block text-xs font-medium text-dark/60 mb-1">Paciente *</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchPatient}
                                onChange={(e) => {
                                    setSearchPatient(e.target.value)
                                    if (form.patient_id) {
                                        setForm((prev) => ({ ...prev, patient_id: '' }))
                                    }
                                }}
                                placeholder="Buscar por apellido..."
                                className={inputClass('patient_id')}
                            />
                            {selectedPatient && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                            )}
                        </div>
                        {errors.patient_id && <p className="text-xs text-error mt-1">{errors.patient_id}</p>}

                        {/* Dropdown results */}
                        {showDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-pastel shadow-lg max-h-48 overflow-y-auto">
                                {patients.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => selectPatient(p)}
                                        className="w-full px-3 py-2.5 text-left hover:bg-pastel-light transition-colors text-sm cursor-pointer
                               flex items-center justify-between"
                                    >
                                        <span className="font-medium text-dark">{p.last_name}, {p.first_name}</span>
                                        <span className="text-xs text-dark/30">DNI: {p.dni}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Clinic */}
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1">Clínica *</label>
                        <select name="clinic_id" value={form.clinic_id} onChange={handleChange} className={inputClass('clinic_id')}>
                            <option value="">Seleccionar clínica...</option>
                            {clinics.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {errors.clinic_id && <p className="text-xs text-error mt-1">{errors.clinic_id}</p>}
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1">Fecha *</label>
                        <input name="date" type="date" value={form.date} onChange={handleChange} className={inputClass('date')} />
                        {errors.date && <p className="text-xs text-error mt-1">{errors.date}</p>}
                    </div>
                    
                    {/* Smart Time Grid */}
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1.5 flex justify-between items-center">
                            <span>Horarios Disponibles *</span>
                            {loadingTimes && <span className="text-[10px] text-accent animate-pulse uppercase pr-1">Consultando...</span>}
                        </label>
                        
                        {(!form.date || !form.clinic_id) ? (
                            <div className="text-sm text-dark/40 bg-gray-soft/50 p-4 rounded-xl border border-dashed border-gray-soft text-center h-[90px] flex items-center justify-center">
                                Seleccioná clínica y fecha para ver los horarios.
                            </div>
                        ) : (
                            <div className="bg-gray-soft/20 rounded-xl border border-pastel p-2">
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 scrollbar-thin">
                                    {timeSlots.map(t => {
                                        const isBooked = bookedTimes.includes(t)
                                        const isSelected = form.time === t
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                disabled={isBooked}
                                                onClick={() => {
                                                    setForm(prev => ({...prev, time: t}))
                                                    if(errors.time) setErrors(prev => ({...prev, time: ''}))
                                                }}
                                                className={`py-2 px-1 text-xs rounded-lg border transition-all cursor-pointer flex-1
                                                    ${isBooked 
                                                        ? 'bg-gray-soft border-transparent text-dark/20 line-through cursor-not-allowed opacity-50' 
                                                        : isSelected 
                                                            ? 'bg-accent border-accent text-dark font-bold shadow-md transform scale-105 ring-2 ring-accent/30'
                                                            : 'bg-white border-pastel text-dark hover:border-accent hover:bg-pastel shadow-sm'}`}
                                            >
                                                {t}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        {errors.time && <p className="text-xs text-error mt-1">{errors.time}</p>}
                    </div>

                    {/* Treatment */}
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1">Tratamiento *</label>
                        <input
                            name="treatment"
                            value={form.treatment}
                            onChange={handleChange}
                            placeholder="Ej: Control, Limpieza, Ortodoncia..."
                            className={inputClass('treatment')}
                        />
                        {errors.treatment && <p className="text-xs text-error mt-1">{errors.treatment}</p>}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1">Notas</label>
                        <textarea
                            name="notes"
                            value={form.notes}
                            onChange={handleChange}
                            rows={2}
                            placeholder="Información adicional..."
                            className={`${inputClass('notes')} resize-none`}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl border border-gray-soft text-sm font-medium
                         text-dark/70 hover:bg-gray-soft transition-all duration-200 cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-4 rounded-xl bg-accent text-dark text-sm font-semibold
                         hover:bg-accent-hover active:scale-[0.98] shadow-sm
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-200 cursor-pointer"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-dark/30 border-t-dark rounded-full animate-spin" />
                                    Agendando...
                                </span>
                            ) : 'Agendar turno'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AppointmentModal
