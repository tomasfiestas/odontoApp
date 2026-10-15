import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SkeletonList } from '../components/Skeleton'
import AppointmentModal from '../components/AppointmentModal'

function formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const statusConfig = {
    pendiente: { label: 'Pendiente', bg: 'bg-accent/15', text: 'text-accent-hover' },
    completado: { label: 'Completado', bg: 'bg-success/10', text: 'text-success' },
    cancelado: { label: 'Cancelado', bg: 'bg-error/10', text: 'text-error' },
}

const PatientAppointments = () => {
    const { id: patientId } = useParams()
    const [appointments, setAppointments] = useState([])
    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)

        const { data: patientData } = await supabase
            .from('patients')
            .select('id, first_name, last_name, dni')
            .eq('id', patientId)
            .single()
        if (patientData) setPatient(patientData)

        const { data: aptData } = await supabase
            .from('appointments')
            .select('*, clinics(name)')
            .eq('patient_id', patientId)
            .order('date', { ascending: false })
            .order('time', { ascending: false })

        if (aptData) setAppointments(aptData)
        setLoading(false)
    }, [patientId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    if (loading) {
        return <SkeletonList count={4} />
    }

    return (
        <div>
            {/* Back button */}
            <Link
                to={`/patients/${patientId}`}
                className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark mb-6 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver al paciente
            </Link>

            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-dark">Turnos</h1>
                    {patient && (
                        <p className="text-sm text-dark/50 mt-0.5">
                            {patient.last_name}, {patient.first_name}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-dark text-sm font-semibold
                               hover:bg-accent-hover active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-sm w-full sm:w-auto"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuevo Turno
                </button>
            </div>

            {/* Appointments list */}
            {appointments.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-pastel">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pastel flex items-center justify-center">
                        <svg className="w-8 h-8 text-dark/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-dark/50 font-medium">No hay turnos para este paciente</p>
                    <button
                        onClick={() => setModalOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pastel-light text-dark text-sm font-semibold
                                   hover:bg-pastel transition-all duration-200 cursor-pointer"
                    >
                        <svg className="w-4 h-4 text-dark/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Agendar el primer turno
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {appointments.map((apt) => {
                        const status = statusConfig[apt.status] || statusConfig.pendiente
                        const isFromHC = apt.source === 'historia_clinica'

                        return (
                            <div
                                key={apt.id}
                                className={`bg-white rounded-2xl border p-5 transition-shadow hover:shadow-sm ${isFromHC ? 'border-l-4 border-l-accent border-pastel' : 'border-pastel'
                                    }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                    {/* Left: date, treatment, clinic */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-sm font-semibold text-dark">
                                                {formatDate(apt.date)}
                                            </span>
                                            {apt.time && (
                                                <span className="text-xs text-dark/40">
                                                    {apt.time} hs
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-dark/80 mb-1">{apt.treatment}</p>

                                        {apt.clinics?.name && (
                                            <p className="text-xs text-dark/40">{apt.clinics.name}</p>
                                        )}
                                    </div>

                                    {/* Right: status + source badges */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isFromHC && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-pastel text-dark/50 px-2 py-1 rounded-lg">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Desde HC
                                            </span>
                                        )}
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${status.bg} ${status.text}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Notes */}
                                {apt.notes && (
                                    <div className="mt-3 pt-3 border-t border-gray-soft">
                                        <p className="text-xs text-dark/50">{apt.notes}</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <AppointmentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={() => {
                    setModalOpen(false)
                    fetchData()
                }}
                defaultPatient={patient}
            />
        </div>
    )
}

export default PatientAppointments
