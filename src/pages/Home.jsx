import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PatientModal from '../components/PatientModal'
import { SkeletonList } from '../components/Skeleton'

function getTodayStr() {
    const d = new Date()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${month}-${day}`
}

function formatCurrency(amount, currency = 'ARS') {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0
    }).format(amount)
}

const statusConfig = {
    pendiente: { label: 'En Espera', bg: 'bg-accent/15', text: 'text-accent-hover', dot: 'bg-accent-hover' },
    completado: { label: 'Atendido', bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
    cancelado: { label: 'Cancelado', bg: 'bg-error/10', text: 'text-error', dot: 'bg-error' },
}

const Home = () => {
    const { user } = useAuth()
    const [patientModalOpen, setPatientModalOpen] = useState(false)
    const [loading, setLoading] = useState(true)

    // Data states
    const [todayAppointments, setTodayAppointments] = useState([])
    const [stats, setStats] = useState({
        totalPatients: 0,
        todayCount: 0,
        todayIncomeARS: 0,
        todayIncomeUSD: 0
    })

    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Doctor'

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true)
            const todayStr = getTodayStr()

            try {
                // 1. Total Patients Count
                const { count: patientsCount } = await supabase
                    .from('patients')
                    .select('id', { count: 'exact', head: true })

                // 2. Today's Appointments
                const { data: apts } = await supabase
                    .from('appointments')
                    .select('*, patients(first_name, last_name, dni), clinics(name)')
                    .eq('date', todayStr)
                    .eq('doctor_id', user.id)
                    .order('time', { ascending: true })

                // 3. Today's Income
                let incomeARS = 0
                let incomeUSD = 0

                const { data: hcData } = await supabase
                    .from('clinical_history')
                    .select('payments(amount, currency)')
                    .eq('date', todayStr)
                    .eq('doctor_id', user.id)

                if (hcData) {
                    hcData.forEach(hc => {
                        if (hc.payments && hc.payments.length > 0) {
                            hc.payments.forEach(p => {
                                const amount = Number(p.amount) || 0
                                if (p.currency === 'USD') incomeUSD += amount
                                else incomeARS += amount
                            })
                        }
                    })
                }

                setTodayAppointments(apts || [])
                setStats({
                    totalPatients: patientsCount || 0,
                    todayCount: apts?.length || 0,
                    todayIncomeARS: incomeARS,
                    todayIncomeUSD: incomeUSD
                })
            } catch (error) {
                console.error("Error fetching dashboard data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [user.id])

    const quickAccess = [
        {
            label: 'Nuevo paciente',
            color: 'bg-accent/15 text-accent group-hover:bg-accent group-hover:text-dark',
            onClick: () => setPatientModalOpen(true),
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            ),
        },
        {
            to: '/calendar',
            label: 'Mi Calendario',
            color: 'bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
        },
        {
            to: '/patients',
            label: 'Buscar Paciente',
            color: 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white',
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
    ]

    return (
        <div className="pb-24 md:pb-4 max-w-5xl mx-auto">
            {/* Header Greeting */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-dark tracking-tight">
                    ¡Hola, {userName}! 👋
                </h1>
                <p className="text-dark/50 mt-1.5 text-lg">Este es tu resumen para hoy.</p>
            </div>

            {loading ? (
                <SkeletonList count={3} />
            ) : (
                <>
                    {/* KPIs - Smart Panel */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-2xl border border-pastel p-5 relative overflow-hidden">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-dark/40 mb-1">Turnos de Hoy</h3>
                            <p className="text-3xl font-extrabold text-dark">{stats.todayCount}</p>
                            <div className="absolute top-0 right-0 p-4 -mr-4 -mt-4 opacity-5">
                                <svg className="w-24 h-24 text-dark" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-pastel p-5 relative overflow-hidden">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-dark/40 mb-1">Total Pacientes</h3>
                            <p className="text-3xl font-extrabold text-dark">{stats.totalPatients}</p>
                        </div>

                        <div className="bg-white rounded-2xl border border-accent/20 bg-accent/5 p-5 relative overflow-hidden col-span-2 md:col-span-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-dark/60 mb-1">Ingresos Registrados Hoy</h3>
                            <div className="flex items-end gap-4">
                                <p className="text-3xl font-extrabold text-dark">{formatCurrency(stats.todayIncomeARS, 'ARS')}</p>
                                {stats.todayIncomeUSD > 0 && (
                                    <p className="text-lg font-bold text-success mb-1">{formatCurrency(stats.todayIncomeUSD, 'USD')}</p>
                                )}
                            </div>
                            <Link to="/billing" className="absolute top-4 right-4 text-accent-hover hover:text-dark transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Daily Agenda Timeline */}
                        <div className="lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-dark">Agenda del Día</h2>
                                <span className="px-3 py-1 bg-pastel-light rounded-full text-xs font-semibold text-dark/60">{getTodayStr()}</span>
                            </div>

                            {todayAppointments.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-pastel p-10 text-center">
                                    <div className="w-16 h-16 bg-gray-soft rounded-full flex items-center justify-center mx-auto mb-4 text-dark/30">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="text-dark font-medium mb-1">Día Libre</h3>
                                    <p className="text-sm text-dark/50">No tenés turnos programados para hoy.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-pastel overflow-hidden">
                                    <div className="divide-y divide-gray-soft">
                                        {todayAppointments.map((apt) => {
                                            const status = statusConfig[apt.status] || statusConfig.pendiente
                                            
                                            return (
                                                <div key={apt.id} className="p-4 hover:bg-gray-soft/20 transition-colors flex gap-4 group">
                                                    
                                                    {/* Time column */}
                                                    <div className="w-16 shrink-0 text-right pt-1">
                                                        <p className="text-sm font-bold text-dark">{apt.time?.slice(0, 5) || '--:--'}</p>
                                                        <p className="text-xs text-dark/40 font-medium uppercase mt-0.5">hs</p>
                                                    </div>

                                                    {/* Timeline Node */}
                                                    <div className="relative flex flex-col items-center">
                                                        <div className={`w-3 h-3 rounded-full z-10 mt-1.5 shadow-sm ring-4 ring-white ${status.dot}`}></div>
                                                        <div className="w-px h-full bg-pastel absolute top-5 group-last:hidden"></div>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 pb-2">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <Link to={`/patients/${apt.patient_id}`} className="text-base font-bold text-dark hover:text-accent-hover transition-colors">
                                                                {apt.patients ? `${apt.patients.last_name}, ${apt.patients.first_name}` : 'Paciente Eliminado'}
                                                            </Link>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${status.bg} ${status.text}`}>
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                        
                                                        <p className="text-sm text-dark/70 mb-1 inline-flex items-center gap-1.5">
                                                            <svg className="w-3.5 h-3.5 text-dark/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                            </svg>
                                                            {apt.clinics?.name || 'Clínica Desconocida'}
                                                        </p>
                                                        
                                                        <p className="text-sm text-dark border-l-2 border-pastel-dark pl-2 ml-1 mt-2">
                                                            <span className="font-medium">Tratamiento:</span> {apt.treatment}
                                                        </p>
                                                        
                                                        {apt.notes && (
                                                            <p className="text-xs text-dark/50 italic mt-1.5 pl-3">{apt.notes}</p>
                                                        )}
                                                    </div>

                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Access Sidebar */}
                        <div className="lg:col-span-1">
                            <h2 className="text-sm font-semibold text-dark/40 uppercase tracking-wider mb-4">Acciones Rápidas</h2>
                            <div className="flex flex-col gap-3">
                                {quickAccess.map((item) => {
                                    const Comp = item.onClick ? 'button' : Link
                                    const props = item.onClick ? { onClick: item.onClick, type: 'button' } : { to: item.to }
                                    
                                    return (
                                        <Comp
                                            key={item.label}
                                            {...props}
                                            className="bg-white rounded-2xl border border-pastel p-4 text-left w-full
                                            hover:shadow-md hover:border-accent/30 flex items-center gap-4
                                            transition-all duration-300 group cursor-pointer"
                                        >
                                            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 ${item.color}`}>
                                                {item.icon}
                                            </div>
                                            <span className="text-sm font-semibold text-dark group-hover:text-accent-hover transition-colors">{item.label}</span>
                                        </Comp>
                                    )
                                })}
                            </div>
                        </div>

                    </div>
                </>
            )}

            {/* Patient Modal */}
            <PatientModal
                isOpen={patientModalOpen}
                onClose={() => setPatientModalOpen(false)}
                onSaved={() => { 
                    // Refresh data if needed or just navigate to new patient.
                }}
            />
        </div>
    )
}

export default Home
