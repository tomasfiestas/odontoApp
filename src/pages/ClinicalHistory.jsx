import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ClinicalHistoryModal from '../components/ClinicalHistoryModal'
import { SkeletonList, SkeletonHCEntry } from '../components/Skeleton'

function formatDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const ClinicalHistory = () => {
    const { id: patientId } = useParams()
    const [entries, setEntries] = useState([])
    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)

    const fetchData = async () => {
        setLoading(true)

        // Fetch patient info
        const { data: patientData } = await supabase
            .from('patients')
            .select('first_name, last_name, clinic_id')
            .eq('id', patientId)
            .single()
        if (patientData) setPatient(patientData)

        // Fetch HC entries with payments
        const { data: hcData } = await supabase
            .from('clinical_history')
            .select('*, payments(*)')
            .eq('patient_id', patientId)
            .order('date', { ascending: false })

        if (hcData) setEntries(hcData)
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [patientId])

    if (loading) {
        return <SkeletonList count={4} Card={SkeletonHCEntry} />
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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-dark">Historia Clínica</h1>
                    {patient && (
                        <p className="text-sm text-dark/50 mt-0.5">
                            {patient.last_name}, {patient.first_name}
                        </p>
                    )}
                </div>
            </div>

            {/* Entries */}
            {entries.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pastel flex items-center justify-center">
                        <svg className="w-8 h-8 text-dark/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-dark/50 font-medium">No hay historia clínica para este paciente aún</p>
                    <p className="text-dark/30 text-sm mt-1">Agregá la primera entrada con el botón +</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {entries.map((entry) => {
                        const payment = entry.payments?.[0]
                        return (
                            <div
                                key={entry.id}
                                className="bg-white rounded-2xl border border-pastel p-5 hover:shadow-sm transition-shadow"
                            >
                                {/* Date */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-pastel-light">
                                            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-semibold text-dark">{formatDate(entry.date)}</span>
                                    </div>

                                    {/* Payment chip */}
                                    {payment && (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-success/10 text-success px-2.5 py-1 rounded-lg">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1" />
                                            </svg>
                                            ${payment.amount?.toLocaleString('es-AR')} {payment.currency} — {payment.method}
                                        </span>
                                    )}
                                </div>

                                {/* Treatment */}
                                <div className="mb-2">
                                    <p className="text-xs font-medium text-dark/40 mb-0.5">Tratamiento</p>
                                    <p className="text-sm text-dark">{entry.treatment}</p>
                                </div>

                                {/* Observations */}
                                {entry.observations && (
                                    <div>
                                        <p className="text-xs font-medium text-dark/40 mb-0.5">Observaciones</p>
                                        <p className="text-sm text-dark/70 whitespace-pre-wrap">{entry.observations}</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* FAB */}
            <button
                onClick={() => setModalOpen(true)}
                className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-accent rounded-full shadow-lg
                   flex items-center justify-center text-dark
                   hover:bg-accent-hover hover:shadow-xl hover:scale-105
                   active:scale-95 transition-all duration-200 z-20 cursor-pointer"
            >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            </button>

            {/* Modal */}
            <ClinicalHistoryModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetchData}
                patientId={patientId}
                clinicId={patient?.clinic_id}
            />
        </div>
    )
}

export default ClinicalHistory
