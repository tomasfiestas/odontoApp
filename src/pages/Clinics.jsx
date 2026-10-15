import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonList } from '../components/Skeleton'
import ClinicModal from '../components/ClinicModal'

const Clinics = () => {
    const { user } = useAuth()
    const [clinics, setClinics] = useState([])
    const [appointments, setAppointments] = useState([])
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedClinicId, setExpandedClinicId] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)

    const fetchClinicsData = useCallback(async () => {
        setLoading(true)

        try {
            // 1. Fetch clinics
            const { data: clinicsData } = await supabase
                .from('doctor_clinics')
                .select('clinic_id, clinics(id, name)')
                .eq('doctor_id', user.id)

            if (!clinicsData) {
                setClinics([])
                setLoading(false)
                return
            }
            const formattedClinics = clinicsData.map(dc => dc.clinics)

            // 2. Fetch future appointments for this doctor
            const todayStr = new Date().toISOString().split('T')[0]
            const { data: aptsData } = await supabase
                .from('appointments')
                .select('clinic_id, date, time')
                .eq('doctor_id', user.id)
                .gte('date', todayStr)
                .order('date', { ascending: true })
                .order('time', { ascending: true })

            // 3. Fetch patients for this doctor
            const { data: patientsData } = await supabase
                .from('patients')
                .select('id, first_name, last_name, dni, clinic_id')
                .order('last_name', { ascending: true })

            setClinics(formattedClinics)
            setAppointments(aptsData || [])
            setPatients(patientsData || [])
        } catch (error) {
            console.error('Error fetching clinics data', error)
        } finally {
            setLoading(false)
        }
    }, [user.id])

    useEffect(() => {
        fetchClinicsData()
    }, [fetchClinicsData])

    const handleSaved = () => {
        fetchClinicsData()
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        const [year, month, day] = dateStr.split('-')
        return `${day}/${month}/${year}`
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-dark">Clínicas</h1>
                    <p className="text-sm text-dark/50 mt-0.5">Gestión de consultorios y clínicas</p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-dark text-sm font-semibold
                               hover:bg-accent-hover active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-sm min-w-[160px]"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Clínica
                </button>
            </div>

            {/* List */}
            <div className="pb-24 md:pb-4">
                {loading ? (
                    <SkeletonList count={3} />
                ) : clinics.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-pastel p-10 text-center">
                        <div className="w-16 h-16 bg-gray-soft text-dark/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-dark mb-2">Aún no hay clínicas</h3>
                        <p className="text-dark/60 text-sm max-w-sm mx-auto mb-6">
                            Creá tu primera clínica o consultorio para empezar a organizar tus pacientes y turnos por lugar de atención.
                        </p>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-dark text-sm font-semibold
                                       hover:bg-accent-hover transition-all duration-200 cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                            </svg>
                            Agregar mi primera clínica
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {clinics.map(clinic => {
                            const nextApt = appointments.find(a => a.clinic_id === clinic.id)
                            const cPatients = patients.filter(p => p.clinic_id === clinic.id)
                            const isExpanded = expandedClinicId === clinic.id

                            return (
                                <div key={clinic.id} className="bg-white rounded-2xl border border-pastel overflow-hidden group hover:border-accent/30 transition-colors">
                                    <div
                                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                                        onClick={() => setExpandedClinicId(isExpanded ? null : clinic.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-accent/15 text-accent rounded-xl flex items-center justify-center shrink-0">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-dark">{clinic.name}</h3>
                                                <p className="text-sm text-dark/50 mt-0.5 flex items-center gap-1.5 top-0.5">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Próximo turno: {nextApt ? <span className="text-dark font-medium">{formatDate(nextApt.date)} a las {nextApt.time}</span> : '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-gray-soft sm:border-0 pt-3 sm:pt-0">
                                            <span className="text-xs font-semibold bg-gray-soft text-dark/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {cPatients.length} paciente{cPatients.length !== 1 ? 's' : ''}
                                            </span>
                                            <svg className={`w-5 h-5 text-dark/30 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-accent' : 'group-hover:text-dark/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Expanded Patients Area */}
                                    <div
                                        className={`transition-all duration-300 ease-in-out border-t border-pastel bg-pastel-light/30 overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 border-t-0'}`}
                                    >
                                        <div className="p-4 sm:p-5 max-h-[500px] overflow-y-auto">
                                            {cPatients.length === 0 ? (
                                                <div className="text-center py-6">
                                                    <p className="text-sm text-dark/40 font-medium">No hay pacientes asignados a esta clínica</p>
                                                    <p className="text-xs text-dark/30 mt-1">Podés asignar un paciente al editar su perfil o al crear un nuevo turno.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {cPatients.map(p => (
                                                        <Link
                                                            key={p.id}
                                                            to={`/patients/${p.id}`}
                                                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-pastel hover:border-accent/30 hover:shadow-sm transition-all duration-200"
                                                        >
                                                            <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-sm font-semibold text-dark shrink-0">
                                                                {p.first_name?.charAt(0)}{p.last_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-dark truncate">{p.last_name}, {p.first_name}</p>
                                                                <p className="text-xs text-dark/40 truncate">DNI: {p.dni || '-'}</p>
                                                            </div>
                                                            <svg className="w-4 h-4 text-dark/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <ClinicModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={handleSaved}
            />
        </div>
    )
}

export default Clinics
