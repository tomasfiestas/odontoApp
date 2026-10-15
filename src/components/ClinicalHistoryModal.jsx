import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const today = () => new Date().toISOString().split('T')[0]

const ClinicalHistoryModal = ({ isOpen, onClose, onSaved, patientId, clinicId }) => {
    const { user } = useAuth()
    const [form, setForm] = useState({
        date: today(),
        treatment: '',
        observations: '',
    })
    const [payment, setPayment] = useState({
        amount: '',
        currency: 'ARS',
        method: 'Efectivo',
        notes: '',
    })
    const [showPayment, setShowPayment] = useState(false)
    const [errors, setErrors] = useState({})
    const [loading, setLoading] = useState(false)
    const [apiError, setApiError] = useState('')

    useEffect(() => {
        if (isOpen) {
            setForm({ date: today(), treatment: '', observations: '' })
            setPayment({ amount: '', currency: 'ARS', method: 'Efectivo', notes: '' })
            setShowPayment(false)
            setErrors({})
            setApiError('')
        }
    }, [isOpen])

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    }

    const handlePaymentChange = (e) => {
        const { name, value } = e.target
        setPayment((prev) => ({ ...prev, [name]: value }))
    }

    const validate = () => {
        const newErrors = {}
        if (!form.date) newErrors.date = 'Requerido'
        if (!form.treatment.trim()) newErrors.treatment = 'Requerido'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setLoading(true)
        setApiError('')

        try {
            // 1. Insert clinical history
            const { data: hcData, error: hcError } = await supabase
                .from('clinical_history')
                .insert({
                    patient_id: patientId,
                    clinic_id: clinicId,
                    doctor_id: user.id,
                    date: form.date,
                    treatment: form.treatment.trim(),
                    observations: form.observations.trim() || null,
                })
                .select('id')
                .single()

            if (hcError) throw hcError

            // 2. Insert payment if filled
            if (showPayment && payment.amount) {
                const { error: payError } = await supabase
                    .from('payments')
                    .insert({
                        clinical_history_id: hcData.id,
                        patient_id: patientId,
                        amount: parseFloat(payment.amount),
                        currency: payment.currency,
                        method: payment.method,
                        notes: payment.notes.trim() || null,
                    })
                if (payError) throw payError
            }

            // 3. Insert appointment linked to HC
            const { error: aptError } = await supabase
                .from('appointments')
                .insert({
                    patient_id: patientId,
                    clinic_id: clinicId,
                    doctor_id: user.id,
                    date: form.date,
                    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    treatment: form.treatment.trim(),
                    status: 'completado',
                    source: 'historia_clinica',
                    notes: form.observations.trim() || null,
                })
            if (aptError) throw aptError

            onSaved()
            onClose()
        } catch (err) {
            setApiError(err.message || 'Error al guardar la entrada.')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    const inputClass = (field) =>
        `w-full px-3 py-2 rounded-xl border text-sm text-dark placeholder:text-dark/30
     focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all duration-200
     ${errors[field] ? 'border-error bg-error/5' : 'border-gray-soft bg-gray-soft/50'}`

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center md:p-4 md:pt-[5vh] overflow-y-auto">
            <div className="fixed inset-0 bg-dark/40 backdrop-blur-sm hidden md:block" onClick={onClose} />

            <div className="relative bg-white md:rounded-2xl shadow-xl w-full max-w-lg p-6 min-h-screen md:min-h-0 md:my-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-dark">Nueva entrada — Historia Clínica</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-soft text-dark/40 hover:text-dark transition-colors cursor-pointer">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {apiError && (
                    <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                        {apiError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Date */}
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1">Fecha de atención *</label>
                        <input name="date" type="date" value={form.date} onChange={handleChange} className={inputClass('date')} />
                        {errors.date && <p className="text-xs text-error mt-1">{errors.date}</p>}
                    </div>

                    {/* Treatment */}
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1">Tratamiento realizado *</label>
                        <textarea
                            name="treatment"
                            value={form.treatment}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Ej: Limpieza dental, extracción de muela..."
                            className={`${inputClass('treatment')} resize-none`}
                        />
                        {errors.treatment && <p className="text-xs text-error mt-1">{errors.treatment}</p>}
                    </div>

                    {/* Observations */}
                    <div>
                        <label className="block text-xs font-medium text-dark/60 mb-1">Observaciones</label>
                        <textarea
                            name="observations"
                            value={form.observations}
                            onChange={handleChange}
                            rows={2}
                            placeholder="Notas adicionales..."
                            className={`${inputClass('observations')} resize-none`}
                        />
                    </div>

                    {/* Payment section (collapsible) */}
                    <div className="border border-gray-soft rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowPayment(!showPayment)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-dark/70 hover:bg-gray-soft/50 transition-colors cursor-pointer"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-dark/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Registrar pago
                            </span>
                            <svg className={`w-4 h-4 text-dark/30 transition-transform duration-200 ${showPayment ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showPayment && (
                            <div className="px-4 pb-4 space-y-3 border-t border-gray-soft pt-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-dark/60 mb-1">Monto</label>
                                        <input
                                            name="amount"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={payment.amount}
                                            onChange={handlePaymentChange}
                                            placeholder="5000"
                                            className={inputClass('')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-dark/60 mb-1">Moneda</label>
                                        <select name="currency" value={payment.currency} onChange={handlePaymentChange} className={inputClass('')}>
                                            <option value="ARS">ARS</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-dark/60 mb-1">Método de pago</label>
                                    <select name="method" value={payment.method} onChange={handlePaymentChange} className={inputClass('')}>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Transferencia">Transferencia</option>
                                        <option value="Tarjeta">Tarjeta</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-dark/60 mb-1">Notas del pago</label>
                                    <input
                                        name="notes"
                                        value={payment.notes}
                                        onChange={handlePaymentChange}
                                        placeholder="Información adicional..."
                                        className={inputClass('')}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-soft text-sm font-medium
                         text-dark/70 hover:bg-gray-soft transition-all duration-200 cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-accent text-dark text-sm font-semibold
                         hover:bg-accent-hover active:scale-[0.98]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-200 cursor-pointer"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-dark/30 border-t-dark rounded-full animate-spin" />
                                    Guardando...
                                </span>
                            ) : 'Guardar entrada'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ClinicalHistoryModal
