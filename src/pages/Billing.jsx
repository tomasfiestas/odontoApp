import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonList } from '../components/Skeleton'

const Billing = () => {
    const { user } = useAuth()
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    
    // Default to current month, format YYYY-MM
    const getCurrentMonthStr = () => {
        const d = new Date()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        return `${d.getFullYear()}-${month}`
    }
    const [monthFilter, setMonthFilter] = useState(getCurrentMonthStr())

    useEffect(() => {
        const fetchPayments = async () => {
            setLoading(true)
            try {
                // Fetch clinical history with nested payments
                const { data, error } = await supabase
                    .from('clinical_history')
                    .select(`
                        id, date, treatment,
                        patients (first_name, last_name),
                        clinics (name),
                        payments (*)
                    `)
                    .order('date', { ascending: false })

                // Supabase doesn't let us filter nested joins by user easily if there's no doctor_id on payments
                // But clinical_history has doctor_id, wait, RLS already filters clinical_history by doctor_id.
                // We will rely on RLS and just flatten the array.

                if (error) throw error

                const flattened = []
                if (data) {
                    data.forEach(hc => {
                        if (hc.payments && hc.payments.length > 0) {
                            hc.payments.forEach(p => {
                                flattened.push({
                                    ...p,
                                    patientName: hc.patients ? `${hc.patients.last_name}, ${hc.patients.first_name}` : 'Paciente desconocido',
                                    clinicName: hc.clinics?.name || '-',
                                    hcDate: hc.date,
                                    treatment: hc.treatment
                                })
                            })
                        }
                    })
                }

                // Sort by payment created_at descending
                flattened.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                setPayments(flattened)
            } catch (err) {
                console.error('Error fetching payments:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchPayments()
    }, [user.id])

    // Filter payments by selected month
    const filteredPayments = useMemo(() => {
        if (!monthFilter) return payments
        return payments.filter(p => {
            // p.created_at might be '2026-03-24T12:00:00Z'
            // Need to match YYYY-MM
            return p.created_at.startsWith(monthFilter) || p.date?.startsWith(monthFilter)
            // wait, payment table doesn't have 'date', it has 'created_at'.
        })
    }, [payments, monthFilter])

    // Calculate KPIs
    const kpis = useMemo(() => {
        const totals = {
            ARS: { total: 0, efectivo: 0, transferencia: 0, tarjeta: 0 },
            USD: { total: 0, efectivo: 0, transferencia: 0, tarjeta: 0 }
        }

        filteredPayments.forEach(p => {
            const currency = p.currency === 'USD' ? 'USD' : 'ARS'
            const method = p.method?.toLowerCase() || 'efectivo'
            const amount = Number(p.amount) || 0

            totals[currency].total += amount
            if (totals[currency][method] !== undefined) {
                totals[currency][method] += amount
            }
        })
        return totals
    }, [filteredPayments])

    const formatCurrency = (amount, currency = 'ARS') => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount)
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    }

    if (loading) {
        return (
            <div>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-dark">Cobros y Finanzas</h1>
                    <p className="text-dark/50 mt-1">Gestión de pagos y métricas</p>
                </div>
                <SkeletonList count={5} />
            </div>
        )
    }

    return (
        <div className="pb-24 md:pb-4">
            {/* Header & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-dark">Cobros y Finanzas</h1>
                    <p className="text-sm text-dark/50 mt-0.5">Gestión de pagos y reportes de ingresos</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-dark/70">Período:</label>
                    <input
                        type="month"
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-pastel bg-white text-sm text-dark font-medium
                                   focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer shadow-sm"
                    />
                    {monthFilter && (
                        <button 
                            onClick={() => setMonthFilter('')}
                            className="text-xs text-dark/40 hover:text-dark transition-colors"
                        >
                            Ver todo
                        </button>
                    )}
                </div>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                {/* ARS Card */}
                <div className="bg-white rounded-2xl border border-pastel p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -translate-y-16 translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>
                    <h3 className="text-sm font-bold text-dark/50 uppercase tracking-wider mb-2">Ingresos ARS</h3>
                    <p className="text-4xl font-extrabold text-dark mb-6">{formatCurrency(kpis.ARS.total, 'ARS')}</p>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-dark/70">
                                <span className="w-2 h-2 rounded-full bg-success"></span> Efectivo
                            </span>
                            <span className="font-semibold">{formatCurrency(kpis.ARS.efectivo, 'ARS')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-dark/70">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Transferencia
                            </span>
                            <span className="font-semibold">{formatCurrency(kpis.ARS.transferencia, 'ARS')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-dark/70">
                                <span className="w-2 h-2 rounded-full bg-orange-400"></span> Tarjeta
                            </span>
                            <span className="font-semibold">{formatCurrency(kpis.ARS.tarjeta, 'ARS')}</span>
                        </div>
                    </div>
                </div>

                {/* USD Card */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -translate-y-16 translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>
                    <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-2">Ingresos USD</h3>
                    <p className="text-4xl font-extrabold text-white mb-6">{formatCurrency(kpis.USD.total, 'USD')}</p>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-white/70">
                                <span className="w-2 h-2 rounded-full bg-success"></span> Efectivo
                            </span>
                            <span className="font-semibold text-white">{formatCurrency(kpis.USD.efectivo, 'USD')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-white/70">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Transferencia
                            </span>
                            <span className="font-semibold text-white">{formatCurrency(kpis.USD.transferencia, 'USD')}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 text-white/70">
                                <span className="w-2 h-2 rounded-full bg-orange-400"></span> Tarjeta
                            </span>
                            <span className="font-semibold text-white">{formatCurrency(kpis.USD.tarjeta, 'USD')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details List */}
            <div>
                <h3 className="text-lg font-bold text-dark mb-4">Detalle de Cobros</h3>
                
                {filteredPayments.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-pastel p-10 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pastel flex items-center justify-center">
                            <svg className="w-8 h-8 text-dark/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-dark/50 font-medium">No hay cobros registrados en este período</p>
                        <p className="text-dark/30 text-sm mt-1">Los cobros se registrarán automáticamente al añadirlos a una Historia Clínica.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-pastel overflow-hidden">
                        {/* Desktop Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-pastel-light/50 border-b border-pastel text-xs font-bold text-dark/50 uppercase tracking-wider">
                            <div className="col-span-2">Fecha</div>
                            <div className="col-span-3">Paciente</div>
                            <div className="col-span-3">Tratamiento</div>
                            <div className="col-span-2">Método</div>
                            <div className="col-span-2 text-right">Monto</div>
                        </div>

                        {/* List Items */}
                        <div className="divide-y divide-gray-soft">
                            {filteredPayments.map(payment => (
                                <div key={payment.id} className="p-4 hover:bg-gray-soft/20 transition-colors">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 md:items-center">
                                        
                                        {/* Mobile: Date & Amount Row */}
                                        <div className="flex justify-between items-center md:hidden mb-2">
                                            <span className="text-xs font-medium text-dark/50">{formatDate(payment.created_at)}</span>
                                            <span className={`font-bold ${payment.currency === 'USD' ? 'text-green-600' : 'text-dark'}`}>
                                                {formatCurrency(payment.amount, payment.currency)}
                                            </span>
                                        </div>

                                        {/* Desktop Date */}
                                        <div className="hidden md:block col-span-2 text-sm text-dark/70">
                                            {formatDate(payment.created_at)}
                                        </div>

                                        {/* Patient & Clinic */}
                                        <div className="col-span-3">
                                            <p className="text-sm font-semibold text-dark">{payment.patientName}</p>
                                            <p className="text-xs text-dark/40 truncate">{payment.clinicName}</p>
                                        </div>

                                        {/* Treatment (Mobile labels) */}
                                        <div className="col-span-3">
                                            <span className="md:hidden text-xs text-dark/40 mr-1">Tto:</span>
                                            <span className="text-sm text-dark/80">{payment.treatment}</span>
                                        </div>

                                        {/* Method */}
                                        <div className="col-span-2 flex items-center md:block mt-1 md:mt-0">
                                            <span className="inline-flex items-center text-xs font-medium bg-gray-soft px-2.5 py-1 rounded-lg capitalize text-dark/70">
                                                {payment.method || 'Efectivo'}
                                            </span>
                                        </div>

                                        {/* Desktop Amount */}
                                        <div className="hidden md:flex col-span-2 justify-end items-center">
                                            <span className={`font-bold ${payment.currency === 'USD' ? 'text-green-600' : 'text-dark'}`}>
                                                {formatCurrency(payment.amount, payment.currency)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Billing
