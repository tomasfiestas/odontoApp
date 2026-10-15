import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

const CONDITIONS = {
    healthy: { label: 'Sano', color: 'bg-white border-pastel text-dark' },
    caries: { label: 'Caries', color: 'bg-error border-error text-white' },
    extracted: { label: 'Ausente', color: 'bg-gray-soft border-gray-400 text-dark/30 opacity-60' },
    crown: { label: 'Corona', color: 'bg-[#FFD700] border-[#DAA520] text-[#8B6508]' },
    filling: { label: 'Empaste', color: 'bg-blue-400 border-blue-500 text-white' },
    implant: { label: 'Implante', color: 'bg-slate-500 border-slate-600 text-white' }
}

const Tooth = ({ number, condition, onClick }) => {
    const style = CONDITIONS[condition]?.color || CONDITIONS.healthy.color
    return (
        <button 
            type="button"
            onClick={() => onClick(number)}
            className={`w-10 h-14 rounded-md border-2 flex flex-col justify-between items-center py-1 transition-all hover:scale-105 ${style}`}
            title={`Diente ${number} - ${CONDITIONS[condition]?.label || 'Sano'}`}
        >
            <span className="text-xs font-bold">{number}</span>
            <div className="w-5 h-5 rounded-full bg-white/30 border border-black/10"></div>
        </button>
    )
}

const Odontogram = ({ patientId }) => {
    const { showToast } = useToast()
    const [toothData, setToothData] = useState({})
    const [loading, setLoading] = useState(true)
    
    const [selectedTooth, setSelectedTooth] = useState(null)
    const [isSaving, setIsSaving] = useState(false)

    // Quadrants
    const upperRight = [18,17,16,15,14,13,12,11]
    const upperLeft = [21,22,23,24,25,26,27,28]
    const lowerRight = [48,47,46,45,44,43,42,41]
    const lowerLeft = [31,32,33,34,35,36,37,38]

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('odontograms')
                .select('tooth_number, condition')
                .eq('patient_id', patientId)

            if (data) {
                const mapped = {}
                data.forEach(d => {
                    mapped[d.tooth_number] = d.condition
                })
                setToothData(mapped)
            }
            if (error) {
                console.error("Error fetching odontogram:", error)
                // Default gracefully if table doesn't exist
            }
            setLoading(false)
        }
        fetchData()
    }, [patientId])

    const handleToothClick = (num) => {
        setSelectedTooth(num)
    }

    const saveCondition = async (condition) => {
        if (!selectedTooth) return
        setIsSaving(true)
        
        try {
            // Eliminar registro previo
            await supabase
                .from('odontograms')
                .delete()
                .eq('patient_id', patientId)
                .eq('tooth_number', selectedTooth)

            // Insertar si no es el default (sano)
            if (condition !== 'healthy') {
                const { error } = await supabase
                    .from('odontograms')
                    .insert({
                        patient_id: patientId,
                        tooth_number: selectedTooth,
                        condition: condition
                    })
                if (error) {
                    if (error.code === '42P01') {
                        throw new Error('La tabla odontograms no existe. Por favor ejecuta el script SQL.')
                    }
                    throw error
                }
            }

            setToothData(prev => ({
                ...prev,
                [selectedTooth]: condition
            }))
            showToast(`Diente ${selectedTooth} actualizado`, 'success')
            setSelectedTooth(null)
        } catch (err) {
            console.error(err)
            showToast(err.message || 'Error al actualizar el diente', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    if (loading) return (
        <div className="bg-white rounded-2xl border border-pastel p-10 text-center">
            <div className="w-8 h-8 border-4 border-pastel border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-dark/50">Cargando odontograma...</p>
        </div>
    )

    return ( 
        <div className="bg-white rounded-2xl border border-pastel p-6 relative overflow-x-auto">
            <div className="mb-6 flex justify-between items-center">
                <h3 className="text-xl font-bold text-dark">Odontograma Interactivo</h3>
                <div className="flex gap-4 text-xs font-semibold text-dark/50">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-pastel bg-white"></span> Sano</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-error"></span> Caries</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#FFD700]"></span> Corona</span>
                </div>
            </div>
            
            <div className="min-w-[800px] flex flex-col items-center gap-8 py-4">
                {/* Upper Teeth */}
                <div className="flex gap-4">
                    <div className="flex gap-1 border-r border-dashed border-pastel pr-4">
                        {upperRight.map(num => (
                            <Tooth key={num} number={num} condition={toothData[num] || 'healthy'} onClick={handleToothClick} />
                        ))}
                    </div>
                    <div className="flex gap-1 pl-4 border-l border-dashed border-transparent">
                        {upperLeft.map(num => (
                            <Tooth key={num} number={num} condition={toothData[num] || 'healthy'} onClick={handleToothClick} />
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="w-full max-w-3xl h-px bg-pastel flex items-center justify-center">
                    <span className="px-4 py-1 bg-pastel-light rounded-full text-[10px] font-bold text-dark/40 uppercase tracking-widest">
                        Plano Oclusal
                    </span>
                </div>

                {/* Lower Teeth */}
                <div className="flex gap-4">
                    <div className="flex gap-1 border-r border-dashed border-pastel pr-4">
                        {lowerRight.map(num => (
                            <Tooth key={num} number={num} condition={toothData[num] || 'healthy'} onClick={handleToothClick} />
                        ))}
                    </div>
                    <div className="flex gap-1 pl-4 border-l border-dashed border-transparent">
                        {lowerLeft.map(num => (
                            <Tooth key={num} number={num} condition={toothData[num] || 'healthy'} onClick={handleToothClick} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Condition Selector Modal */}
            {selectedTooth && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-dark/40 backdrop-blur-[2px]" onClick={() => setSelectedTooth(null)}></div>
                    <div className="relative bg-white rounded-2xl shadow-xl border border-pastel p-6 w-full max-w-sm transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xl font-bold text-dark">Diente {selectedTooth}</h4>
                            <button onClick={() => setSelectedTooth(null)} className="text-dark/40 hover:bg-gray-soft p-1 rounded-xl">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <p className="text-sm font-medium text-dark/50 mb-4">Seleccionar el diagnóstico o tratamiento actual:</p>
                        
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {Object.entries(CONDITIONS).map(([key, val]) => (
                                <button
                                    key={key}
                                    onClick={() => saveCondition(key)}
                                    disabled={isSaving}
                                    className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 shadow-sm ${val.color}`}
                                >
                                    <span className="text-sm font-bold">{val.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Odontogram
