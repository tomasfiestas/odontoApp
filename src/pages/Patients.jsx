import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PatientModal from '../components/PatientModal'
import { SkeletonList } from '../components/Skeleton'

const PAGE_SIZE = 20

const Patients = () => {
    const { user } = useAuth()
    const [patients, setPatients] = useState([])
    const [search, setSearch] = useState('')
    const [clinicFilter, setClinicFilter] = useState('')
    const [clinics, setClinics] = useState([])
    const [loading, setLoading] = useState(true)
    const [hasMore, setHasMore] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const observerRef = useRef()
    const pageRef = useRef(0)
    const searchTimeout = useRef(null)

    // Load clinics for filter
    useEffect(() => {
        const fetchClinics = async () => {
            const { data } = await supabase
                .from('doctor_clinics')
                .select('clinic_id, clinics(id, name)')
                .eq('doctor_id', user.id)
            if (data) setClinics(data.map((dc) => dc.clinics))
        }
        fetchClinics()
    }, [user.id])

    // Fetch patients
    const fetchPatients = useCallback(async (reset = false) => {
        setLoading(true)
        const page = reset ? 0 : pageRef.current
        const from = page * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        let query = supabase
            .from('patients')
            .select('id, first_name, last_name, dni, clinic_id, clinics(name)', { count: 'exact' })
            .order('last_name', { ascending: true })
            .range(from, to)

        if (search.trim()) {
            query = query.ilike('last_name', `%${search.trim()}%`)
        }

        if (clinicFilter) {
            query = query.eq('clinic_id', clinicFilter)
        }

        const { data, count, error } = await query

        if (!error && data) {
            if (reset) {
                setPatients(data)
                pageRef.current = 1
            } else {
                setPatients((prev) => [...prev, ...data])
                pageRef.current = page + 1
            }
            setHasMore(from + data.length < (count || 0))
        }
        setLoading(false)
    }, [search, clinicFilter])

    // Initial load + reset on filter change
    useEffect(() => {
        pageRef.current = 0
        fetchPatients(true)
    }, [fetchPatients])

    // Debounced search
    const handleSearchChange = (e) => {
        const value = e.target.value
        setSearch(value)
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => {
            pageRef.current = 0
        }, 300)
    }

    // Infinite scroll observer
    const lastCardRef = useCallback(
        (node) => {
            if (loading) return
            if (observerRef.current) observerRef.current.disconnect()
            observerRef.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    fetchPatients(false)
                }
            })
            if (node) observerRef.current.observe(node)
        },
        [loading, hasMore, fetchPatients]
    )

    const handleSaved = () => {
        pageRef.current = 0
        fetchPatients(true)
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-dark">Pacientes</h1>
                    <p className="text-sm text-dark/50 mt-0.5">Listado de pacientes registrados</p>
                </div>

                {/* Clinic filter */}
                <select
                    value={clinicFilter}
                    onChange={(e) => setClinicFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-soft bg-white text-sm text-dark
                     focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                >
                    <option value="">Todas las clínicas</option>
                    {clinics.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Search bar */}
            <div className="relative mb-6">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    type="text"
                    value={search}
                    onChange={handleSearchChange}
                    placeholder="Buscar por apellido..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-soft bg-white text-sm text-dark
                     placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     transition-all duration-200"
                />
            </div>

            {/* Patient list */}
            <div className="space-y-3 pb-24 md:pb-4">
                {patients.map((patient, index) => {
                    const isLast = index === patients.length - 1
                    return (
                        <Link
                            key={patient.id}
                            to={`/patients/${patient.id}`}
                            ref={isLast ? lastCardRef : undefined}
                            className="block bg-white rounded-2xl border border-pastel p-4
                         hover:shadow-md hover:border-accent/30
                         transition-all duration-200 group"
                        >
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className="w-11 h-11 rounded-full bg-accent/15 flex items-center justify-center text-sm font-semibold text-dark shrink-0
                                group-hover:bg-accent group-hover:text-dark transition-all duration-200">
                                    {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-dark truncate">
                                        {patient.last_name}, {patient.first_name}
                                    </p>
                                    <p className="text-xs text-dark/40 mt-0.5">
                                        DNI: {patient.dni}
                                    </p>
                                </div>

                                {/* Clinic badge */}
                                {patient.clinics?.name && (
                                    <span className="hidden sm:inline-block text-[11px] font-medium text-dark/40 bg-gray-soft px-2.5 py-1 rounded-lg">
                                        {patient.clinics.name}
                                    </span>
                                )}

                                {/* Chevron */}
                                <svg className="w-4 h-4 text-dark/20 group-hover:text-accent transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    )
                })}

                {/* Loading skeletons */}
                {loading && patients.length === 0 && (
                    <SkeletonList count={6} />
                )}

                {/* Loading more spinner */}
                {loading && patients.length > 0 && (
                    <div className="flex justify-center py-6">
                        <div className="w-7 h-7 border-3 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Empty state */}
                {!loading && patients.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pastel flex items-center justify-center">
                            <svg className="w-8 h-8 text-dark/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <p className="text-dark/50 font-medium">No se encontraron pacientes</p>
                        <p className="text-dark/30 text-sm mt-1">Agregá tu primer paciente con el botón +</p>
                    </div>
                )}
            </div>

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
            <PatientModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={handleSaved}
            />
        </div>
    )
}

export default Patients
