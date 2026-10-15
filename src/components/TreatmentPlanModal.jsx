import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const TOOTH_NUMBERS = [
    'General',
    // Maxilar Superior
    '18', '17', '16', '15', '14', '13', '12', '11',
    '21', '22', '23', '24', '25', '26', '27', '28',
    // Maxilar Inferior
    '48', '47', '46', '45', '44', '43', '42', '41',
    '31', '32', '33', '34', '35', '36', '37', '38',
]

export const COMMON_PROCEDURES = [
    { label: '🦷 Resina', name: 'Restauración Resina Fotocurable', cost: 25000 },
    { label: '⚡ Conducto', name: 'Tratamiento de Conducto (Endodoncia)', cost: 60000 },
    { label: '🦷 Extracción', name: 'Extracción Dental Simple', cost: 20000 },
    { label: '✨ Limpieza', name: 'Limpieza y Tartrectomía', cost: 18000 },
    { label: '👑 Corona', name: 'Corona de Porcelana / Zirconio', cost: 120000 },
    { label: '📌 Perno', name: 'Perno y Muñón Colado', cost: 40000 },
    { label: '🔩 Implante', name: 'Implante Dental Quirúrgico', cost: 250000 },
    { label: '💎 Blanqueamiento', name: 'Blanqueamiento Dental', cost: 50000 },
    { label: '🛡️ Bruxismo', name: 'Placa Miorrelajante Rígida', cost: 45000 },
]

const emptyItem = {
    tooth_number: 'General',
    procedure_name: '',
    cost: '',
    status: 'pendiente',
}

const TreatmentPlanModal = ({ isOpen, onClose, onSaved, patientId, clinicId, plan = null }) => {
    const { user } = useAuth()
    const [title, setTitle] = useState('Plan de Tratamiento')
    const [currency, setCurrency] = useState('ARS')
    const [status, setStatus] = useState('borrador')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState([{ ...emptyItem }])
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const isEdit = Boolean(plan)

    useEffect(() => {
        if (!isOpen) return
        if (plan) {
            setTitle(plan.title || 'Plan de Tratamiento')
            setCurrency(plan.currency || 'ARS')
            setStatus(plan.status || 'borrador')
            setNotes(plan.notes || '')
            // Load items
            const fetchItems = async () => {
                const { data } = await supabase
                    .from('treatment_plan_items')
                    .select('*')
                    .eq('plan_id', plan.id)
                    .order('order_index', { ascending: true })
                if (data && data.length > 0) {
                    setItems(data.map((it) => ({
                        id: it.id,
                        tooth_number: it.tooth_number || 'General',
                        procedure_name: it.procedure_name || '',
                        cost: it.cost || 0,
                        status: it.status || 'pendiente',
                    })))
                } else {
                    setItems([{ ...emptyItem }])
                }
            }
            fetchItems()
        } else {
            setTitle('Plan de Tratamiento')
            setCurrency('ARS')
            setStatus('borrador')
            setNotes('Forma de pago: 50% de anticipo al inicio, saldo al finalizar.')
            setItems([{ ...emptyItem }])
        }
        setErrorMsg('')
    }, [isOpen, plan])

    const addItem = () => {
        setItems((prev) => [...prev, { ...emptyItem }])
    }

    const addPresetItem = (preset) => {
        const itemCost = currency === 'USD' ? Math.round(preset.cost / 1200) : preset.cost
        setItems((prev) => {
            // Replace if only one pristine empty item
            if (prev.length === 1 && !prev[0].procedure_name && !prev[0].cost) {
                return [{
                    tooth_number: 'General',
                    procedure_name: preset.name,
                    cost: itemCost,
                    status: 'pendiente',
                }]
            }
            return [
                ...prev,
                {
                    tooth_number: 'General',
                    procedure_name: preset.name,
                    cost: itemCost,
                    status: 'pendiente',
                },
            ]
        })
    }

    const removeItem = (index) => {
        if (items.length === 1) return
        setItems((prev) => prev.filter((_, i) => i !== index))
    }

    const handleItemChange = (index, field, value) => {
        setItems((prev) => {
            const next = [...prev]
            next[index] = { ...next[index], [field]: value }
            return next
        })
    }

    const totalCalculated = items.reduce((acc, item) => {
        const val = parseFloat(item.cost) || 0
        return acc + val
    }, 0)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!title.trim()) {
            setErrorMsg('El título del plan es requerido')
            return
        }

        const validItems = items.filter((it) => it.procedure_name.trim() !== '')
        if (validItems.length === 0) {
            setErrorMsg('Agregá al menos una prestación con nombre')
            return
        }

        setLoading(true)
        setErrorMsg('')

        try {
            let planId = plan?.id

            // 1. Create or Update Plan header
            if (isEdit) {
                const { error: planErr } = await supabase
                    .from('treatment_plans')
                    .update({
                        title: title.trim(),
                        status,
                        currency,
                        total_amount: totalCalculated,
                        notes: notes.trim() || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', planId)
                if (planErr) throw planErr
            } else {
                const { data: newPlan, error: planErr } = await supabase
                    .from('treatment_plans')
                    .insert({
                        patient_id: patientId,
                        clinic_id: clinicId || null,
                        doctor_id: user?.id || null,
                        title: title.trim(),
                        status,
                        currency,
                        total_amount: totalCalculated,
                        notes: notes.trim() || null,
                    })
                    .select()
                    .single()
                if (planErr) throw planErr
                planId = newPlan.id
            }

            // 2. Refresh items (Delete old items and re-insert)
            if (isEdit) {
                await supabase.from('treatment_plan_items').delete().eq('plan_id', planId)
            }

            const itemsPayload = validItems.map((item, idx) => ({
                plan_id: planId,
                tooth_number: item.tooth_number || 'General',
                procedure_name: item.procedure_name.trim(),
                cost: parseFloat(item.cost) || 0,
                status: item.status || 'pendiente',
                order_index: idx,
            }))

            const { error: itemsErr } = await supabase.from('treatment_plan_items').insert(itemsPayload)
            if (itemsErr) throw itemsErr

            onSaved()
            onClose()
        } catch (err) {
            console.error('Error saving treatment plan:', err)
            setErrorMsg('Error al guardar el plan de tratamiento. Verificá si ejecutaste 04_clinical_enhancements.sql en Supabase.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[4vh] overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-dark/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl max-w-2xl w-full p-6 shadow-xl border border-pastel my-4 z-10">
                <div className="flex items-center justify-between pb-4 border-b border-pastel">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">📑</span>
                        <div>
                            <h2 className="text-lg font-bold text-dark">
                                {isEdit ? 'Editar Presupuesto / Plan' : 'Nuevo Presupuesto / Plan de Tratamiento'}
                            </h2>
                            <p className="text-xs text-dark/50">
                                Cotizá prestaciones, piezas y condiciones de pago
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-dark/40 hover:text-dark hover:bg-gray-soft transition-colors cursor-pointer"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {errorMsg && (
                    <div className="p-3 my-4 rounded-xl bg-error/10 text-error text-xs font-medium">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    {/* Header Row: Title & Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-dark/70 mb-1">
                                Título del Plan *
                            </label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej: Plan de Rehabilitación Integral"
                                className="w-full px-3 py-2 rounded-xl border border-pastel bg-pastel-light/20 text-xs font-medium text-dark focus:outline-none focus:border-accent"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-dark/70 mb-1">
                                Estado
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-pastel bg-white text-xs font-medium text-dark focus:outline-none focus:border-accent"
                            >
                                <option value="borrador">📝 Borrador</option>
                                <option value="presentado">📨 Presentado</option>
                                <option value="aceptado">✅ Aceptado</option>
                                <option value="en_curso">⚡ En curso</option>
                                <option value="finalizado">🏆 Finalizado</option>
                                <option value="cancelado">❌ Cancelado</option>
                            </select>
                        </div>
                    </div>

                    {/* Currency & Payment conditions */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-dark/70 mb-1">
                                Moneda
                            </label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-pastel bg-white text-xs font-medium text-dark focus:outline-none focus:border-accent"
                            >
                                <option value="ARS">ARS ($ Pesos)</option>
                                <option value="USD">USD ($ Dólares)</option>
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-dark/70 mb-1">
                                Condiciones de Pago o Notas
                            </label>
                            <input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Ej: 50% al inicio, saldo en 3 cuotas con tarjeta..."
                                className="w-full px-3 py-2 rounded-xl border border-pastel bg-pastel-light/20 text-xs text-dark focus:outline-none focus:border-accent"
                            />
                        </div>
                    </div>

                    {/* Items Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-dark flex items-center gap-1.5">
                                <span>🦷 Prestaciones y Tratamientos</span>
                                <span className="text-dark/40 font-normal">({items.length})</span>
                            </label>
                            <button
                                type="button"
                                onClick={addItem}
                                className="text-xs font-semibold text-accent-hover hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                                <span>+ Agregar prestación</span>
                            </button>
                        </div>

                        {/* Quick Presets Bar */}
                        <div className="mb-3">
                            <span className="text-[10px] font-bold text-dark/40 uppercase tracking-wider block mb-1.5">
                                ⚡ Carga Rápida (1 Clic)
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {COMMON_PROCEDURES.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => addPresetItem(preset)}
                                        className="text-[11px] font-medium bg-pastel-light hover:bg-pastel text-dark border border-pastel px-2 py-1 rounded-lg transition-colors cursor-pointer"
                                        title={`Agregar ${preset.name}`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 bg-pastel-light/40 p-2.5 rounded-2xl border border-pastel"
                                >
                                    {/* Tooth selector */}
                                    <div className="w-24 shrink-0">
                                        <select
                                            value={item.tooth_number}
                                            onChange={(e) => handleItemChange(idx, 'tooth_number', e.target.value)}
                                            className="w-full bg-white border border-pastel rounded-xl px-2 py-1.5 text-xs font-medium text-dark focus:outline-none"
                                        >
                                            {TOOTH_NUMBERS.map((t) => (
                                                <option key={t} value={t}>
                                                    {t === 'General' ? 'General' : `Pieza ${t}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Procedure name */}
                                    <div className="flex-1 min-w-0">
                                        <input
                                            value={item.procedure_name}
                                            onChange={(e) => handleItemChange(idx, 'procedure_name', e.target.value)}
                                            placeholder="Tratamiento (ej: Endodoncia, Corona, Resina...)"
                                            className="w-full bg-white border border-pastel rounded-xl px-2.5 py-1.5 text-xs text-dark focus:outline-none focus:border-accent"
                                            required
                                        />
                                    </div>

                                    {/* Cost input */}
                                    <div className="w-28 shrink-0">
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-dark/40">
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={item.cost}
                                                onChange={(e) => handleItemChange(idx, 'cost', e.target.value)}
                                                placeholder="0.00"
                                                className="w-full pl-6 pr-2 py-1.5 bg-white border border-pastel rounded-xl text-xs font-bold text-dark text-right focus:outline-none focus:border-accent"
                                            />
                                        </div>
                                    </div>

                                    {/* Status selector */}
                                    <div className="w-28 shrink-0 hidden sm:block">
                                        <select
                                            value={item.status}
                                            onChange={(e) => handleItemChange(idx, 'status', e.target.value)}
                                            className="w-full bg-white border border-pastel rounded-xl px-2 py-1.5 text-xs text-dark focus:outline-none"
                                        >
                                            <option value="pendiente">Pendiente</option>
                                            <option value="en_proceso">En proceso</option>
                                            <option value="completado">Completado</option>
                                        </select>
                                    </div>

                                    {/* Remove item button */}
                                    <button
                                        type="button"
                                        onClick={() => removeItem(idx)}
                                        disabled={items.length === 1}
                                        className="p-1.5 rounded-lg text-dark/30 hover:text-error hover:bg-red-50 disabled:opacity-20 cursor-pointer transition-colors"
                                        title="Quitar"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total Summary Footer */}
                    <div className="bg-pastel-light rounded-2xl p-4 flex items-center justify-between border border-pastel">
                        <div>
                            <span className="text-xs text-dark/50 block">Presupuesto Total:</span>
                            <span className="text-xl font-black text-dark">
                                {currency === 'USD' ? 'USD $' : '$'} {new Intl.NumberFormat('es-AR').format(totalCalculated)}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl border border-gray-soft text-xs font-semibold text-dark/70 hover:bg-gray-soft transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-dark text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Presupuesto'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default TreatmentPlanModal
