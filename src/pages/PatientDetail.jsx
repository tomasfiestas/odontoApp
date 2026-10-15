import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PatientModal, { MEDICAL_ALERT_OPTIONS } from '../components/PatientModal'
import PaymentModal from '../components/PaymentModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonDetail } from '../components/Skeleton'

function calculateAge(birthDate) {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
}

const PatientDetail = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [editOpen, setEditOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [financial, setFinancial] = useState({ totalPlans: 0, totalPaid: 0, balanceDue: 0, hasPlans: false })
    const [plansList, setPlansList] = useState([])

    const fetchPatient = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('patients')
            .select('*, clinics(name)')
            .eq('id', id)
            .single()

        if (!error && data) {
            setPatient(data)
        }

        // Fetch treatment plans & payments to compute current account balance
        try {
            const { data: plansData } = await supabase
                .from('treatment_plans')
                .select('id, title, status, total_amount')
                .eq('patient_id', id)

            const { data: payData } = await supabase
                .from('payments')
                .select('amount')
                .eq('patient_id', id)

            if (plansData) setPlansList(plansData)

            const totalPlans = (plansData || [])
                .filter((p) => ['aceptado', 'en_curso', 'finalizado'].includes(p.status))
                .reduce((acc, p) => acc + (parseFloat(p.total_amount) || 0), 0)

            const totalPayments = (payData || []).reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0)
            const due = Math.max(0, totalPlans - totalPayments)

            setFinancial({
                totalPlans,
                totalPaid: totalPayments,
                balanceDue: due,
                hasPlans: (plansData || []).length > 0,
            })
        } catch (fErr) {
            console.warn('Financial calculation warning:', fErr)
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchPatient()
    }, [id])

    const handleDelete = async () => {
        setDeleting(true)
        const { error } = await supabase.from('patients').delete().eq('id', id)
        setDeleting(false)
        if (!error) {
            navigate('/patients', { replace: true })
        }
    }

    if (loading) {
        return <SkeletonDetail />
    }

    if (!patient) {
        return (
            <div className="text-center py-20">
                <p className="text-dark/50 font-medium">Paciente no encontrado</p>
                <Link to="/patients" className="text-accent hover:underline text-sm mt-2 inline-block">
                    Volver a la lista
                </Link>
            </div>
        )
    }

    const age = calculateAge(patient.birth_date)

    const infoFields = [
        { label: 'DNI', value: patient.dni },
        { label: 'Fecha de nacimiento', value: patient.birth_date ? new Date(patient.birth_date + 'T12:00:00').toLocaleDateString('es-AR') : '—' },
        { label: 'Edad', value: age !== null ? `${age} años` : '—' },
        { label: 'Email', value: patient.email || '—' },
        { label: 'Teléfono', value: patient.phone || '—' },
        { label: 'Obra social', value: patient.obra_social || '—' },
        { label: 'Clínica', value: patient.clinics?.name || '—' },
    ]

    return (
        <div>
            {/* Back button */}
            <Link
                to="/patients"
                className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark mb-6 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver a pacientes
            </Link>

            {/* Patient header */}
            <div className="bg-white rounded-2xl border border-pastel p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center text-xl font-bold text-dark shrink-0">
                        {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-dark">
                            {patient.last_name}, {patient.first_name}
                        </h1>
                        <p className="text-sm text-dark/40 mt-0.5">
                            DNI: {patient.dni} · {age !== null ? `${age} años` : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Medical Alerts Banner */}
            {(patient.medical_alerts?.length > 0 || patient.allergies || patient.medical_notes) && (
                <div className="bg-red-50/90 border-2 border-red-300 rounded-2xl p-5 mb-6 shadow-xs">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-red-100 text-error flex items-center justify-center text-xl shrink-0 shadow-inner">
                            🚨
                        </div>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <h3 className="text-sm font-bold text-red-950 uppercase tracking-wider flex items-center gap-1.5">
                                    <span>Alerta Médica Crítica</span>
                                </h3>
                                <span className="text-[10px] font-bold text-red-800 bg-red-200/70 px-2.5 py-0.5 rounded-full">
                                    Verificar antes de anestesiar / recetar
                                </span>
                            </div>

                            {/* Tags */}
                            {patient.medical_alerts?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {patient.medical_alerts.map((alertId) => {
                                        const opt = MEDICAL_ALERT_OPTIONS.find((o) => o.id === alertId)
                                        if (!opt) return null
                                        return (
                                            <span
                                                key={alertId}
                                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold ${
                                                    opt.danger
                                                        ? 'bg-error text-white shadow-xs'
                                                        : 'bg-amber-600 text-white shadow-xs'
                                                }`}
                                            >
                                                <span>{opt.icon}</span>
                                                <span>{opt.label}</span>
                                            </span>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Detailed Notes */}
                            <div className="text-xs text-red-950 space-y-1">
                                {patient.allergies && (
                                    <p>
                                        <strong className="font-semibold text-red-900">Alergias específicas:</strong> {patient.allergies}
                                    </p>
                                )}
                                {patient.medical_notes && (
                                    <p>
                                        <strong className="font-semibold text-red-900">Medicación / Antecedentes:</strong> {patient.medical_notes}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Financial Balance Summary Banner (Semáforo de Saldo) */}
            <div className="bg-white rounded-2xl border border-pastel p-4 sm:p-5 mb-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${financial.balanceDue <= 0 ? 'bg-success' : 'bg-error animate-pulse'}`} />
                    <div>
                        <span className="text-[10px] font-bold text-dark/40 uppercase tracking-wider block">
                            Cuenta Corriente / Saldo
                        </span>
                        <h3 className="text-base font-extrabold text-dark">
                            {financial.balanceDue <= 0
                                ? '🟢 Al día (Sin saldo pendiente)'
                                : `🔴 Saldo Deudor: $ ${new Intl.NumberFormat('es-AR').format(financial.balanceDue)}`}
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPaymentModalOpen(true)}
                        className="bg-pastel-light hover:bg-pastel text-dark text-xs font-semibold px-3 py-2 rounded-xl border border-pastel transition-colors cursor-pointer"
                    >
                        💰 + Registrar Cobro
                    </button>
                    <Link
                        to={`/patients/${id}/plans`}
                        className="bg-accent hover:bg-accent-hover text-dark text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs"
                    >
                        Ver Presupuestos
                    </Link>
                </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
                <Link
                    to={`/patients/${id}/odontogram`}
                    className="flex items-center gap-2.5 bg-white rounded-2xl border border-pastel p-4
                     hover:shadow-md hover:border-accent/30 transition-all duration-200 group"
                >
                    <div className="p-2 rounded-xl bg-pastel-light text-accent group-hover:bg-accent group-hover:text-dark transition-all duration-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-dark">Odontograma</span>
                </Link>

                <Link
                    to={`/patients/${id}/plans`}
                    className="flex items-center gap-2.5 bg-white rounded-2xl border border-pastel p-4
                     hover:shadow-md hover:border-accent/30 transition-all duration-200 group"
                >
                    <div className="p-2 rounded-xl bg-pastel-light text-accent group-hover:bg-accent group-hover:text-dark transition-all duration-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-dark">Presupuestos</span>
                </Link>

                <Link
                    to={`/patients/${id}/files`}
                    className="flex items-center gap-2.5 bg-white rounded-2xl border border-pastel p-4
                     hover:shadow-md hover:border-accent/30 transition-all duration-200 group"
                >
                    <div className="p-2 rounded-xl bg-pastel-light text-accent group-hover:bg-accent group-hover:text-dark transition-all duration-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-dark">Radiografías</span>
                </Link>

                <Link
                    to={`/patients/${id}/history`}
                    className="flex items-center gap-2.5 bg-white rounded-2xl border border-pastel p-4
                     hover:shadow-md hover:border-accent/30 transition-all duration-200 group"
                >
                    <div className="p-2 rounded-xl bg-pastel-light text-accent group-hover:bg-accent group-hover:text-dark transition-all duration-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-dark">Historia Clínica</span>
                </Link>

                <Link
                    to={`/patients/${id}/appointments`}
                    className="flex items-center gap-2.5 bg-white rounded-2xl border border-pastel p-4
                     hover:shadow-md hover:border-accent/30 transition-all duration-200 group"
                >
                    <div className="p-2 rounded-xl bg-pastel-light text-accent group-hover:bg-accent group-hover:text-dark transition-all duration-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-dark">Turnos</span>
                </Link>

                <button
                    onClick={() => setEditOpen(true)}
                    className="flex items-center gap-2.5 bg-white rounded-2xl border border-pastel p-4
                     hover:shadow-md hover:border-accent/30 transition-all duration-200 group cursor-pointer"
                >
                    <div className="p-2 rounded-xl bg-pastel-light text-accent group-hover:bg-accent group-hover:text-dark transition-all duration-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-dark">Editar</span>
                </button>

                <button
                    onClick={() => setDeleteOpen(true)}
                    className="flex items-center gap-2.5 bg-white rounded-2xl border border-pastel p-4
                     hover:shadow-md hover:border-red-200 transition-all duration-200 group cursor-pointer"
                >
                    <div className="p-2 rounded-xl bg-red-50 text-error group-hover:bg-error group-hover:text-white transition-all duration-200">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-dark">Eliminar</span>
                </button>
            </div>

            {/* Patient info */}
            <div className="bg-white rounded-2xl border border-pastel p-6">
                <h2 className="text-lg font-semibold text-dark mb-4">Información del paciente</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {infoFields.map((field) => (
                        <div key={field.label}>
                            <p className="text-xs font-medium text-dark/40 mb-0.5">{field.label}</p>
                            <p className="text-sm text-dark">{field.value}</p>
                        </div>
                    ))}
                </div>

                {patient.observations && (
                    <div className="mt-6 pt-4 border-t border-gray-soft">
                        <p className="text-xs font-medium text-dark/40 mb-1">Observaciones</p>
                        <p className="text-sm text-dark whitespace-pre-wrap">{patient.observations}</p>
                    </div>
                )}
            </div>

            {/* Quick Files / Radiographs Card */}
            <div className="bg-white rounded-2xl border border-pastel p-6 mt-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🩻</span>
                        <h2 className="text-base font-semibold text-dark">Radiografías y Estudios</h2>
                    </div>
                    <Link
                        to={`/patients/${id}/files`}
                        className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                    >
                        Ir a galería
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
                <p className="text-xs text-dark/50 mb-4">
                    Adjuntá radiografías periapicales, panorámicas, fotos de la boca o generá el enlace para que el paciente las envíe desde su celular.
                </p>
                <div className="flex items-center gap-2">
                    <Link
                        to={`/patients/${id}/files`}
                        className="bg-accent hover:bg-accent-hover text-dark font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-xs"
                    >
                        Ver archivos y radiografías
                    </Link>
                </div>
            </div>

            {/* Edit Modal */}
            <PatientModal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                onSaved={fetchPatient}
                patient={patient}
            />

            {/* Delete Confirm */}
            <ConfirmDialog
                isOpen={deleteOpen}
                title="Eliminar paciente"
                message={`¿Estás seguro de que querés eliminar a ${patient.last_name}, ${patient.first_name}? Esta acción no se puede deshacer.`}
                confirmLabel={deleting ? 'Eliminando...' : 'Eliminar'}
                onConfirm={handleDelete}
                onCancel={() => setDeleteOpen(false)}
            />

            {/* Quick Payment Modal */}
            <PaymentModal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onSaved={fetchPatient}
                patientId={id}
                patientName={`${patient?.first_name || ''} ${patient?.last_name || ''}`}
                plans={plansList}
            />
        </div>
    )
}

export default PatientDetail
