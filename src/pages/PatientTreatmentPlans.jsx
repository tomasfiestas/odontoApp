import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import TreatmentPlanModal from '../components/TreatmentPlanModal'
import PaymentModal from '../components/PaymentModal'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonList } from '../components/Skeleton'

const STATUS_CONFIG = {
    borrador: { label: 'Borrador', bg: 'bg-gray-100', text: 'text-dark/70', border: 'border-gray-300' },
    presentado: { label: 'Presentado', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
    aceptado: { label: 'Aceptado', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    en_curso: { label: 'En Curso', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
    finalizado: { label: 'Finalizado', bg: 'bg-success/15', text: 'text-success', border: 'border-success/30' },
    cancelado: { label: 'Cancelado', bg: 'bg-error/10', text: 'text-error', border: 'border-error/30' },
}

function formatCurrency(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD $' : '$'} ${new Intl.NumberFormat('es-AR', {
        maximumFractionDigits: 0,
    }).format(amount || 0)}`
}

function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PatientTreatmentPlans = () => {
    const { id: patientId } = useParams()
    const { showToast } = useToast()
    const printRef = useRef(null)

    const [patient, setPatient] = useState(null)
    const [plans, setPlans] = useState([])
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)

    // Modals & Filters
    const [planModalOpen, setPlanModalOpen] = useState(false)
    const [editingPlan, setEditingPlan] = useState(null)
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [planToDelete, setPlanToDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [statusFilter, setStatusFilter] = useState('todos')

    // Printables
    const [printingPlan, setPrintingPlan] = useState(null)
    const [printingReceipt, setPrintingReceipt] = useState(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // 1. Patient info
            const { data: pData } = await supabase
                .from('patients')
                .select('id, first_name, last_name, dni, phone, clinic_id, clinics(name, phone, address)')
                .eq('id', patientId)
                .single()
            if (pData) setPatient(pData)

            // 2. Treatment plans with items
            const { data: plansData } = await supabase
                .from('treatment_plans')
                .select('*, treatment_plan_items(*)')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
            if (plansData) setPlans(plansData)

            // 3. Payments
            const { data: payData } = await supabase
                .from('payments')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
            if (payData) setPayments(payData)
        } catch (err) {
            console.error('Error fetching treatment plans:', err)
        } finally {
            setLoading(false)
        }
    }, [patientId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Financial Balance Calculations
    // Sum of plans that are accepted, en_curso or finalizado (committed)
    const totalCommittedPlans = plans
        .filter((p) => ['aceptado', 'en_curso', 'finalizado'].includes(p.status))
        .reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0)

    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    const balanceDue = Math.max(0, totalCommittedPlans - totalPaid)
    const isUpToDate = balanceDue <= 0

    // WhatsApp Share for a plan
    const sharePlanWhatsApp = (plan) => {
        const cleanPhone = (patient?.phone || '').replace(/\D/g, '')
        const itemsText = (plan.treatment_plan_items || [])
            .map((it) => `• ${it.tooth_number !== 'General' ? `Pieza ${it.tooth_number}: ` : ''}${it.procedure_name} (${formatCurrency(it.cost, plan.currency)})`)
            .join('\n')

        const message = `🦷 *PRESUPUESTO ODONTOLÓGICO*\n*Clínica:* ${patient?.clinics?.name || 'DentApp'}\n*Paciente:* ${patient?.first_name} ${patient?.last_name} (DNI: ${patient?.dni})\n*Tratamiento:* ${plan.title}\n\n*Detalle de prestaciones:*\n${itemsText || '• Diagnóstico integral'}\n\n*Total presupuestado:* ${formatCurrency(plan.total_amount, plan.currency)}\n${plan.notes ? `*Condiciones:* ${plan.notes}\n` : ''}\nQuedamos a tu disposición para coordinar los turnos.`

        const url = cleanPhone
            ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
    }

    // 1-Click Procedure Status Toggle (Quick clinical progress)
    const handleToggleItemStatus = async (planId, itemId, currentStatus) => {
        const cycle = {
            pendiente: 'en_proceso',
            en_proceso: 'completado',
            completado: 'pendiente',
        }
        const nextStatus = cycle[currentStatus] || 'pendiente'
        const statusLabels = {
            pendiente: 'Pendiente',
            en_proceso: 'En proceso',
            completado: 'Completado',
        }

        // Optimistic UI update
        setPlans((prev) =>
            prev.map((p) => {
                if (p.id !== planId) return p
                return {
                    ...p,
                    treatment_plan_items: (p.treatment_plan_items || []).map((it) => {
                        if (it.id !== itemId) return it
                        return { ...it, status: nextStatus }
                    }),
                }
            })
        )

        try {
            const { error } = await supabase
                .from('treatment_plan_items')
                .update({ status: nextStatus })
                .eq('id', itemId)
            if (error) throw error
            showToast(`Procedimiento marcado como "${statusLabels[nextStatus]}"`, 'success')
        } catch (err) {
            console.error('Error updating item status:', err)
            showToast('Error al actualizar el estado', 'error')
            fetchData() // Rollback on error
        }
    }

    // Print / PDF View for Treatment Plan
    const handlePrintPlan = (plan) => {
        setPrintingReceipt(null)
        setPrintingPlan(plan)
        setTimeout(() => {
            window.print()
        }, 200)
    }

    // Print / PDF View for Official Payment Receipt
    const handlePrintReceipt = (payment) => {
        setPrintingPlan(null)
        setPrintingReceipt(payment)
        setTimeout(() => {
            window.print()
        }, 200)
    }

    // Filtered plans based on tab selection
    const filteredPlans = useMemo(() => {
        if (statusFilter === 'activos') {
            return plans.filter((p) => ['aceptado', 'en_curso'].includes(p.status))
        }
        if (statusFilter === 'finalizados') {
            return plans.filter((p) => ['finalizado', 'cancelado'].includes(p.status))
        }
        if (statusFilter === 'borradores') {
            return plans.filter((p) => ['borrador', 'presentado'].includes(p.status))
        }
        return plans
    }, [plans, statusFilter])

    const handleDeletePlan = async () => {
        if (!planToDelete) return
        setDeleting(true)
        try {
            const { error } = await supabase.from('treatment_plans').delete().eq('id', planToDelete.id)
            if (error) throw error
            showToast('Plan de tratamiento eliminado', 'info')
            setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id))
        } catch (err) {
            console.error(err)
            showToast('Error al eliminar el plan', 'error')
        } finally {
            setDeleting(false)
            setPlanToDelete(null)
        }
    }

    if (loading) {
        return <SkeletonList count={4} />
    }

    return (
        <div className="pb-16">
            {/* Header with Back button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
                <div>
                    <Link
                        to={`/patients/${patientId}`}
                        className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark transition-colors mb-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver al perfil del paciente
                    </Link>
                    <h1 className="text-2xl font-bold text-dark flex items-center gap-2">
                        📑 Planes de Tratamiento y Presupuestos
                    </h1>
                    <p className="text-sm text-dark/50 mt-0.5">
                        Paciente: <strong className="text-dark font-medium">{patient?.last_name}, {patient?.first_name}</strong> · DNI: {patient?.dni}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPaymentModalOpen(true)}
                        className="inline-flex items-center gap-2 bg-pastel-light hover:bg-pastel text-dark font-semibold px-4 py-2.5 rounded-xl border border-pastel shadow-xs transition-colors cursor-pointer text-xs"
                    >
                        <span>💰</span>
                        <span>Registrar Cobro</span>
                    </button>

                    <button
                        onClick={() => {
                            setEditingPlan(null)
                            setPlanModalOpen(true)
                        }}
                        className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-dark font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer text-xs"
                    >
                        <span>+</span>
                        <span>Nuevo Presupuesto</span>
                    </button>
                </div>
            </div>

            {/* Financial Balance Summary Card (Cuenta Corriente / Semáforo de Saldo) */}
            <div className="bg-white rounded-2xl border border-pastel p-5 sm:p-6 mb-8 shadow-xs print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <span className="text-xs font-bold text-dark/50 uppercase tracking-wider block mb-1">
                            Estado Financiero y Cuenta Corriente
                        </span>
                        <div className="flex items-center gap-3">
                            <div className={`w-3.5 h-3.5 rounded-full ${isUpToDate ? 'bg-success animate-pulse' : 'bg-error animate-pulse'}`} />
                            <h2 className="text-xl font-black text-dark">
                                {isUpToDate ? 'Al Día (Sin deuda pendiente)' : `Saldo Pendiente: ${formatCurrency(balanceDue)}`}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-pastel pt-3 sm:pt-0 sm:pl-6 text-xs">
                        <div>
                            <span className="text-dark/40 block">Tratamientos aceptados:</span>
                            <span className="font-bold text-dark text-sm">{formatCurrency(totalCommittedPlans)}</span>
                        </div>
                        <div>
                            <span className="text-dark/40 block">Total cobrado:</span>
                            <span className="font-bold text-success text-sm">{formatCurrency(totalPaid)}</span>
                        </div>
                        <div>
                            <span className="text-dark/40 block">Pagos realizados:</span>
                            <span className="font-bold text-dark text-sm">{payments.length} recibos</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Treatment Plans List */}
            <div className="mb-8 print:hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h3 className="text-base font-bold text-dark flex items-center gap-2">
                        <span>📋 Presupuestos Cotizados</span>
                        <span className="text-xs font-semibold text-dark/40 bg-pastel px-2 py-0.5 rounded-full">
                            {plans.length}
                        </span>
                    </h3>

                    {/* Filter Tabs */}
                    {plans.length > 0 && (
                        <div className="flex items-center gap-1 bg-pastel-light/60 p-1 rounded-xl border border-pastel text-xs">
                            {[
                                { id: 'todos', label: 'Todos', count: plans.length },
                                { id: 'activos', label: 'Activos', count: plans.filter((p) => ['aceptado', 'en_curso'].includes(p.status)).length },
                                { id: 'finalizados', label: 'Finalizados', count: plans.filter((p) => ['finalizado', 'cancelado'].includes(p.status)).length },
                                { id: 'borradores', label: 'Borradores', count: plans.filter((p) => ['borrador', 'presentado'].includes(p.status)).length },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setStatusFilter(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        statusFilter === tab.id
                                            ? 'bg-white text-dark shadow-xs'
                                            : 'text-dark/50 hover:text-dark hover:bg-white/50'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className="text-[10px] opacity-60">({tab.count})</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {filteredPlans.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-pastel p-10 text-center max-w-md mx-auto">
                        <div className="text-4xl mb-3">📑</div>
                        <h4 className="text-sm font-bold text-dark mb-1">
                            {plans.length === 0 ? 'No hay presupuestos creados' : 'No hay presupuestos en esta categoría'}
                        </h4>
                        <p className="text-xs text-dark/50 mb-4">
                            {plans.length === 0
                                ? 'Armá una cotización con las piezas y prestaciones requeridas para entregar al paciente o mandárselo por WhatsApp.'
                                : 'Cambiá de pestaña para ver el resto de los presupuestos.'}
                        </p>
                        {plans.length === 0 && (
                            <button
                                onClick={() => {
                                    setEditingPlan(null)
                                    setPlanModalOpen(true)
                                }}
                                className="bg-accent hover:bg-accent-hover text-dark font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Crear primer presupuesto
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredPlans.map((plan) => {
                            const statusInfo = STATUS_CONFIG[plan.status] || STATUS_CONFIG.borrador
                            const items = plan.treatment_plan_items || []

                            // Calculate paid specifically for this plan
                            const planPaid = payments
                                .filter((pay) => pay.treatment_plan_id === plan.id)
                                .reduce((s, pay) => s + (parseFloat(pay.amount) || 0), 0)
                            const planTotal = parseFloat(plan.total_amount) || 0
                            const percentPaid = planTotal > 0 ? Math.min(100, Math.round((planPaid / planTotal) * 100)) : 0

                            return (
                                <div
                                    key={plan.id}
                                    className="bg-white rounded-2xl border border-pastel p-5 shadow-xs hover:shadow-md transition-all duration-200"
                                >
                                    {/* Top Bar of Card */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-pastel/60 mb-3">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-base font-bold text-dark">{plan.title}</h4>
                                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-black text-dark mr-2">
                                                {formatCurrency(plan.total_amount, plan.currency)}
                                            </span>

                                            {/* WhatsApp Button */}
                                            <button
                                                onClick={() => sharePlanWhatsApp(plan)}
                                                className="inline-flex items-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366] text-[#128C7E] hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                                title="Enviar presupuesto por WhatsApp"
                                            >
                                                <span>📲</span>
                                                <span className="hidden sm:inline">WhatsApp</span>
                                            </button>

                                            {/* Print / PDF Button */}
                                            <button
                                                onClick={() => handlePrintPlan(plan)}
                                                className="inline-flex items-center gap-1.5 bg-pastel-light hover:bg-pastel text-dark px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-pastel"
                                                title="Imprimir o guardar en PDF"
                                            >
                                                <span>🖨️</span>
                                                <span className="hidden sm:inline">Imprimir / PDF</span>
                                            </button>

                                            {/* Edit */}
                                            <button
                                                onClick={() => {
                                                    setEditingPlan(plan)
                                                    setPlanModalOpen(true)
                                                }}
                                                className="p-1.5 text-dark/40 hover:text-dark hover:bg-pastel rounded-lg transition-colors cursor-pointer"
                                                title="Editar plan"
                                            >
                                                ✏️
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={() => setPlanToDelete(plan)}
                                                className="p-1.5 text-dark/40 hover:text-error hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                title="Eliminar plan"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>

                                    {/* Items Table / Breakdown with 1-Click Status Toggles */}
                                    {items.length > 0 && (
                                        <div className="divide-y divide-pastel/40 mb-3 bg-pastel-light/20 rounded-xl px-3">
                                            {items.map((it) => (
                                                <div
                                                    key={it.id || it.order_index}
                                                    className="py-2.5 flex items-center justify-between text-xs"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-[10px] bg-dark/5 text-dark/70 px-2 py-0.5 rounded-md">
                                                            {it.tooth_number === 'General' ? 'General' : `Pieza ${it.tooth_number}`}
                                                        </span>
                                                        <span className="font-medium text-dark">{it.procedure_name}</span>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {/* 1-Click interactive status badge */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleItemStatus(plan.id, it.id, it.status)}
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                                                                it.status === 'completado'
                                                                    ? 'bg-success/15 text-success border-success/30 hover:bg-success/25'
                                                                    : it.status === 'en_proceso'
                                                                    ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                                                                    : 'bg-gray-100 text-dark/60 border-gray-300 hover:bg-gray-200'
                                                            }`}
                                                            title="Hacé clic para cambiar estado (Pendiente ➔ En proceso ➔ Completado)"
                                                        >
                                                            {it.status === 'completado' ? '✓ Listo' : it.status === 'en_proceso' ? '⚡ En curso' : '⏳ Pendiente'}
                                                        </button>

                                                        <span className="font-semibold text-dark min-w-[70px] text-right">
                                                            {formatCurrency(it.cost, plan.currency)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Plan Notes & Terms */}
                                    {plan.notes && (
                                        <p className="text-xs text-dark/60 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 mb-3">
                                            📌 <strong>Condiciones:</strong> {plan.notes}
                                        </p>
                                    )}

                                    {/* Payment Progress Bar for this Plan */}
                                    {['aceptado', 'en_curso', 'finalizado'].includes(plan.status) && (
                                        <div className="pt-2 border-t border-pastel/40">
                                            <div className="flex items-center justify-between text-[11px] mb-1">
                                                <span className="text-dark/50">
                                                    Abonado de este plan: <strong className="text-dark font-bold">{formatCurrency(planPaid, plan.currency)}</strong> de {formatCurrency(planTotal, plan.currency)}
                                                </span>
                                                <span className={`font-black ${percentPaid >= 100 ? 'text-success' : 'text-dark/70'}`}>
                                                    {percentPaid >= 100 ? '🟢 100% Saldado' : `${percentPaid}% Pagado`}
                                                </span>
                                            </div>
                                            <div className="w-full bg-pastel-light rounded-full h-1.5 overflow-hidden border border-pastel/30">
                                                <div
                                                    className={`h-full transition-all duration-300 ${percentPaid >= 100 ? 'bg-success' : percentPaid > 0 ? 'bg-accent' : 'bg-transparent'}`}
                                                    style={{ width: `${percentPaid}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Payments History List */}
            <div className="print:hidden">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-dark flex items-center gap-2">
                        <span>💵 Historial de Cobros y Entregas</span>
                        <span className="text-xs font-semibold text-dark/40 bg-pastel px-2 py-0.5 rounded-full">
                            {payments.length}
                        </span>
                    </h3>
                    <button
                        onClick={() => setPaymentModalOpen(true)}
                        className="text-xs font-semibold text-accent-hover hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                        + Nuevo cobro
                    </button>
                </div>

                {payments.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-pastel p-6 text-center text-xs text-dark/50">
                        No hay pagos o entregas registradas para este paciente.
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-pastel divide-y divide-pastel overflow-hidden shadow-xs">
                        {payments.map((p) => (
                            <div key={p.id} className="p-3.5 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-3">
                                    <span className="text-lg">
                                        {p.method === 'efectivo' ? '💵' : p.method === 'transferencia' ? '📱' : '💳'}
                                    </span>
                                    <div>
                                        <p className="font-bold text-dark capitalize">
                                            Cobro en {p.method}
                                        </p>
                                        <p className="text-[11px] text-dark/40">
                                            {formatDate(p.created_at)} {p.notes ? `· "${p.notes}"` : ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handlePrintReceipt(p)}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-dark/60 hover:text-dark bg-pastel-light hover:bg-pastel px-2.5 py-1 rounded-lg border border-pastel transition-colors cursor-pointer"
                                        title="Imprimir recibo de cobro formal para el paciente"
                                    >
                                        <span>🖨️</span>
                                        <span>Recibo</span>
                                    </button>

                                    <div className="text-right">
                                        <span className="font-black text-success text-sm block">
                                            + {formatCurrency(p.amount, p.currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Hidden Printable Invoice / Budget Format (Triggered on Print) */}
            {printingPlan && (
                <div className="hidden print:block p-8 bg-white text-dark font-sans" ref={printRef}>
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-dark pb-6 mb-6">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight mb-1">
                                {patient?.clinics?.name || 'Clínica Odontológica'}
                            </h1>
                            <p className="text-xs text-dark/70">
                                {patient?.clinics?.address || 'Consultorio Odontológico'}
                            </p>
                            <p className="text-xs text-dark/70">
                                Tel: {patient?.clinics?.phone || '—'}
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-bold text-dark/40 uppercase tracking-widest block mb-1">
                                Presupuesto
                            </span>
                            <p className="text-xs font-semibold">Fecha: {formatDate(printingPlan.created_at)}</p>
                        </div>
                    </div>

                    {/* Patient info box */}
                    <div className="bg-gray-100 rounded-xl p-4 mb-6 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-dark/50 block">Paciente:</span>
                                <strong className="text-sm text-dark">{patient?.last_name}, {patient?.first_name}</strong>
                            </div>
                            <div>
                                <span className="text-dark/50 block">DNI:</span>
                                <strong className="text-sm text-dark">{patient?.dni}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Treatment title */}
                    <h3 className="text-base font-bold mb-3">{printingPlan.title}</h3>

                    {/* Table of procedures */}
                    <table className="w-full text-xs text-left mb-6 border-collapse">
                        <thead>
                            <tr className="border-b border-dark/30 font-bold">
                                <th className="py-2">Pieza</th>
                                <th className="py-2">Prestación / Tratamiento</th>
                                <th className="py-2 text-right">Importe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark/10">
                            {(printingPlan.treatment_plan_items || []).map((it, idx) => (
                                <tr key={idx}>
                                    <td className="py-2.5 font-bold">
                                        {it.tooth_number === 'General' ? 'General' : `Pieza ${it.tooth_number}`}
                                    </td>
                                    <td className="py-2.5">{it.procedure_name}</td>
                                    <td className="py-2.5 text-right font-bold">
                                        {formatCurrency(it.cost, printingPlan.currency)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-dark font-black text-sm">
                                <td colSpan="2" className="pt-3">TOTAL:</td>
                                <td className="pt-3 text-right">
                                    {formatCurrency(printingPlan.total_amount, printingPlan.currency)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Terms */}
                    {printingPlan.notes && (
                        <div className="border border-dark/20 rounded-xl p-3 text-xs mb-8">
                            <strong className="block mb-1">Condiciones de pago y validez:</strong>
                            <p className="text-dark/80">{printingPlan.notes}</p>
                            <p className="text-[10px] text-dark/50 mt-1">Presupuesto válido por 15 días corridos a partir de la fecha de emisión.</p>
                        </div>
                    )}

                    {/* Signature footer */}
                    <div className="flex justify-between pt-16 text-center text-xs">
                        <div className="w-48 border-t border-dark/40 pt-2">
                            Firma del Profesional
                        </div>
                        <div className="w-48 border-t border-dark/40 pt-2">
                            Firma y Aceptación del Paciente
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Printable Official Payment Receipt (Triggered on Print) */}
            {printingReceipt && (
                <div className="hidden print:block p-8 bg-white text-dark font-sans max-w-xl mx-auto border-2 border-dark/80 rounded-2xl" ref={printRef}>
                    <div className="flex justify-between items-start border-b-2 border-dark pb-4 mb-5">
                        <div>
                            <h1 className="text-xl font-black">{patient?.clinics?.name || 'Clínica Odontológica'}</h1>
                            <p className="text-xs text-dark/70">{patient?.clinics?.address || 'Consultorio Odontológico'}</p>
                            <p className="text-xs text-dark/70">Tel: {patient?.clinics?.phone || '—'}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-black uppercase tracking-wider text-dark/60 block">RECIBO DE COBRO</span>
                            <span className="font-mono text-xs font-bold bg-dark/5 px-2 py-0.5 rounded">
                                N° {printingReceipt.id ? `REC-${printingReceipt.id.slice(0, 8).toUpperCase()}` : 'REC-001'}
                            </span>
                            <p className="text-[11px] text-dark/60 mt-1.5">Fecha: {formatDate(printingReceipt.created_at)}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 border border-dark/20 rounded-xl p-4 text-xs space-y-2 mb-6">
                        <div className="flex justify-between">
                            <span className="text-dark/60">Recibí de:</span>
                            <strong className="text-dark font-bold">{patient?.last_name}, {patient?.first_name}</strong>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-dark/60">DNI:</span>
                            <strong className="text-dark">{patient?.dni}</strong>
                        </div>
                        <div className="flex justify-between border-t border-dark/10 pt-2">
                            <span className="text-dark/60">La suma de:</span>
                            <strong className="text-sm font-black text-dark">{formatCurrency(printingReceipt.amount, printingReceipt.currency)} ({printingReceipt.currency})</strong>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-dark/60">Medio de cobro:</span>
                            <span className="font-bold text-dark uppercase">{printingReceipt.method}</span>
                        </div>
                        {printingReceipt.notes && (
                            <div className="border-t border-dark/10 pt-2">
                                <span className="text-dark/60 block mb-0.5">En concepto de:</span>
                                <p className="italic text-dark/80">{printingReceipt.notes}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-end pt-12 pb-4 text-xs">
                        <p className="text-[10px] text-dark/40">Comprobante de cobro emitido por DentApp Clínico</p>
                        <div className="w-52 border-t border-dark/60 pt-2 text-center">
                            Firma y Sello del Profesional
                        </div>
                    </div>
                </div>
            )}

            {/* Treatment Plan Modal */}
            <TreatmentPlanModal
                isOpen={planModalOpen}
                onClose={() => setPlanModalOpen(false)}
                onSaved={fetchData}
                patientId={patientId}
                clinicId={patient?.clinic_id}
                plan={editingPlan}
            />

            {/* Payment Modal */}
            <PaymentModal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                onSaved={fetchData}
                patientId={patientId}
                patientName={`${patient?.first_name} ${patient?.last_name}`}
                plans={plans}
            />

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={!!planToDelete}
                title="Eliminar Presupuesto"
                message={`¿Estás seguro de que querés eliminar el presupuesto "${planToDelete?.title}"?`}
                confirmLabel={deleting ? 'Eliminando...' : 'Eliminar'}
                onConfirm={handleDeletePlan}
                onCancel={() => setPlanToDelete(null)}
            />
        </div>
    )
}

export default PatientTreatmentPlans
