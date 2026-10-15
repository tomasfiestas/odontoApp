import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PaymentModal = ({ isOpen, onClose, onSaved, patientId, patientName, plans = [] }) => {
    const [amount, setAmount] = useState('')
    const [currency, setCurrency] = useState('ARS')
    const [method, setMethod] = useState('efectivo')
    const [planId, setPlanId] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        if (!isOpen) return
        setAmount('')
        setCurrency('ARS')
        setMethod('efectivo')
        setPlanId('')
        setNotes('')
        setErrorMsg('')
    }, [isOpen])

    const handleSubmit = async (e) => {
        e.preventDefault()
        const parsedAmount = parseFloat(amount)
        if (!parsedAmount || parsedAmount <= 0) {
            setErrorMsg('El monto debe ser mayor a 0')
            return
        }

        setLoading(true)
        setErrorMsg('')

        try {
            const { error } = await supabase.from('payments').insert({
                patient_id: patientId,
                amount: parsedAmount,
                currency,
                method,
                treatment_plan_id: planId || null,
                notes: notes.trim() || null,
            })

            if (error) throw error

            onSaved()
            onClose()
        } catch (err) {
            console.error('Error recording payment:', err)
            setErrorMsg('Error al registrar el pago. Verificá si ejecutaste 04_clinical_enhancements.sql.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-dark/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

            <div className="relative bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-pastel z-10">
                <div className="flex items-center justify-between pb-3 border-b border-pastel mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">💰</span>
                        <div>
                            <h2 className="text-base font-bold text-dark">Registrar Cobro / Pago</h2>
                            <p className="text-xs text-dark/50">
                                Paciente: <strong className="text-dark font-medium">{patientName}</strong>
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
                    <div className="p-3 mb-4 rounded-xl bg-error/10 text-error text-xs font-medium">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Amount & Currency */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-dark/70 mb-1">
                                Monto recibido *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-dark/50">
                                    $
                                </span>
                                <input
                                    type="number"
                                    step="any"
                                    min="1"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    autoFocus
                                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-pastel bg-pastel-light/20 text-base font-bold text-dark focus:outline-none focus:border-accent"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-dark/70 mb-1">
                                Moneda
                            </label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-pastel bg-white text-xs font-bold text-dark focus:outline-none focus:border-accent"
                            >
                                <option value="ARS">ARS ($)</option>
                                <option value="USD">USD ($)</option>
                            </select>
                        </div>
                    </div>

                    {/* Method */}
                    <div>
                        <label className="block text-xs font-semibold text-dark/70 mb-1">
                            Método de pago
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'efectivo', label: '💵 Efectivo' },
                                { id: 'transferencia', label: '📱 Transferencia' },
                                { id: 'tarjeta', label: '💳 Tarjeta' },
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setMethod(m.id)}
                                    className={`py-2 px-1 text-center rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                        method === m.id
                                            ? 'bg-accent/20 border-accent text-dark font-bold shadow-xs'
                                            : 'bg-white border-pastel text-dark/60 hover:bg-pastel-light'
                                    }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Link to Treatment Plan (if any) */}
                    {plans && plans.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-dark/70 mb-1">
                                Imputar a Plan de Tratamiento (opcional)
                            </label>
                            <select
                                value={planId}
                                onChange={(e) => setPlanId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-pastel bg-white text-xs font-medium text-dark focus:outline-none focus:border-accent"
                            >
                                <option value="">Cobro general / Sin asignar</option>
                                {plans.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} (${new Intl.NumberFormat('es-AR').format(p.total_amount)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-dark/70 mb-1">
                            Detalle o Concepto (opcional)
                        </label>
                        <input
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Seña primera sesión, Pago total arreglo..."
                            className="w-full px-3 py-2 rounded-xl border border-pastel bg-pastel-light/20 text-xs text-dark focus:outline-none focus:border-accent"
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl border border-gray-soft text-xs font-semibold text-dark/70 hover:bg-gray-soft transition-colors cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !amount}
                            className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-dark text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            {loading ? 'Registrando...' : 'Registrar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default PaymentModal
