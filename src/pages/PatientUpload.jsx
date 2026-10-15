import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const PatientUpload = () => {
    const { id: patientId } = useParams()
    const fileInputRef = useRef(null)

    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedFiles, setSelectedFiles] = useState([])
    const [uploadType, setUploadType] = useState('radiografia')
    const [notes, setNotes] = useState('')
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [submitted, setSubmitted] = useState(false)
    const [errorMsg, setErrorMsg] = useState(null)

    useEffect(() => {
        const fetchPatient = async () => {
            setLoading(true)
            try {
                const { data, error } = await supabase
                    .from('patients')
                    .select('id, first_name, last_name, clinic_id, clinics(name)')
                    .eq('id', patientId)
                    .single()

                if (error || !data) {
                    setErrorMsg('No pudimos encontrar la ficha de paciente solicitada.')
                } else {
                    setPatient(data)
                }
            } catch (err) {
                console.error(err)
                setErrorMsg('Ocurrió un error al cargar la información.')
            } finally {
                setLoading(false)
            }
        }

        if (patientId) {
            fetchPatient()
        }
    }, [patientId])

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || [])
        // Filter strictly images
        const imageFiles = files.filter((f) => f.type.startsWith('image/'))

        if (imageFiles.length < files.length) {
            alert('Solo se permiten archivos de imagen (fotos, radiografías).')
        }

        const newItems = imageFiles.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        }))

        setSelectedFiles((prev) => [...prev, ...newItems])
    }

    const removeFile = (index) => {
        setSelectedFiles((prev) => {
            const next = [...prev]
            URL.revokeObjectURL(next[index].preview)
            next.splice(index, 1)
            return next
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (selectedFiles.length === 0) return

        setUploading(true)
        setProgress(10)
        setErrorMsg(null)

        try {
            let successCount = 0

            for (let i = 0; i < selectedFiles.length; i++) {
                const item = selectedFiles[i]
                const file = item.file
                const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
                const storagePath = `${patientId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`

                // 1. Upload to Supabase Storage bucket 'patient-files'
                const { error: uploadError } = await supabase.storage
                    .from('patient-files')
                    .upload(storagePath, file, { cacheControl: '3600', upsert: false })

                if (uploadError) throw uploadError

                // 2. Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('patient-files')
                    .getPublicUrl(storagePath)

                // 3. Register in DB
                const { error: dbError } = await supabase.from('patient_files').insert({
                    patient_id: patientId,
                    clinic_id: patient?.clinic_id || null,
                    file_name: file.name,
                    file_url: publicUrl,
                    file_type: uploadType,
                    mime_type: file.type,
                    size_bytes: file.size,
                    source: 'patient',
                    notes: notes.trim() || null,
                })

                if (dbError) throw dbError

                successCount++
                setProgress(Math.round(((i + 1) / selectedFiles.length) * 100))
            }

            setSubmitted(true)
        } catch (err) {
            console.error('Error al subir:', err)
            setErrorMsg('Hubo un problema al subir las fotos. Por favor intentalo nuevamente.')
        } finally {
            setUploading(false)
        }
    }

    const resetForm = () => {
        setSelectedFiles([])
        setNotes('')
        setSubmitted(false)
        setProgress(0)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-pastel-light/40 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border border-pastel shadow-sm">
                    <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-sm font-medium text-dark/60">Cargando formulario...</p>
                </div>
            </div>
        )
    }

    if (errorMsg && !patient) {
        return (
            <div className="min-h-screen bg-pastel-light/40 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-pastel shadow-sm">
                    <div className="text-4xl mb-3">⚠️</div>
                    <h2 className="text-lg font-bold text-dark mb-2">Enlace no válido</h2>
                    <p className="text-sm text-dark/60 mb-6">{errorMsg}</p>
                    <p className="text-xs text-dark/40">Por favor contactate con la clínica para que te envíen un nuevo link.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-pastel-light/30 flex flex-col justify-between p-4 sm:p-6 font-sans">
            <div className="max-w-lg w-full mx-auto my-auto py-6">
                {/* Brand Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/20 text-2xl shadow-inner mb-3">
                        🦷
                    </div>
                    <h1 className="text-xl font-bold text-dark tracking-tight">DentApp</h1>
                    {patient?.clinics?.name && (
                        <p className="text-xs font-medium text-dark/50 mt-0.5">{patient.clinics.name}</p>
                    )}
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-3xl border border-pastel p-6 sm:p-8 shadow-sm">
                    {submitted ? (
                        /* Success View */
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
                                ✓
                            </div>
                            <h2 className="text-xl font-bold text-dark mb-2">¡Fotos enviadas con éxito!</h2>
                            <p className="text-sm text-dark/60 mb-6 leading-relaxed">
                                Muchas gracias, <strong className="text-dark">{patient?.first_name}</strong>. Tus fotos fueron adjuntadas directamente a tu ficha médica para tu próxima atención.
                            </p>

                            <button
                                onClick={resetForm}
                                className="w-full bg-pastel-light hover:bg-pastel text-dark font-semibold py-3 px-4 rounded-2xl text-sm transition-colors border border-pastel cursor-pointer"
                            >
                                Subir más fotos
                            </button>
                        </div>
                    ) : (
                        /* Upload Form */
                        <form onSubmit={handleSubmit}>
                            <div className="mb-6">
                                <h2 className="text-lg font-bold text-dark">
                                    Hola, {patient?.first_name}! 👋
                                </h2>
                                <p className="text-xs text-dark/60 mt-1 leading-relaxed">
                                    Subí acá tus fotos o radiografías para que tu odontólogo pueda evaluarlas antes de tu consulta.
                                </p>
                            </div>

                            {errorMsg && (
                                <div className="p-3 mb-4 rounded-xl bg-error/10 text-error text-xs font-medium">
                                    {errorMsg}
                                </div>
                            )}

                            {/* Category Selector */}
                            <div className="mb-5">
                                <label className="block text-xs font-semibold text-dark/70 mb-2">
                                    ¿Qué tipo de imagen vas a enviar?
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setUploadType('radiografia')}
                                        className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                                            uploadType === 'radiografia'
                                                ? 'bg-accent/20 border-accent text-dark shadow-xs'
                                                : 'bg-white border-pastel text-dark/60 hover:bg-pastel-light'
                                        }`}
                                    >
                                        <span>🩻</span>
                                        <span>Radiografía</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setUploadType('foto_clinica')}
                                        className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                                            uploadType === 'foto_clinica'
                                                ? 'bg-accent/20 border-accent text-dark shadow-xs'
                                                : 'bg-white border-pastel text-dark/60 hover:bg-pastel-light'
                                        }`}
                                    >
                                        <span>📸</span>
                                        <span>Foto de la boca</span>
                                    </button>
                                </div>
                            </div>

                            {/* Big Camera / Gallery Button */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                            />

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-accent hover:bg-accent/5 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 mb-5 bg-pastel-light/20"
                            >
                                <div className="w-12 h-12 mx-auto rounded-full bg-accent/20 text-dark flex items-center justify-center text-2xl mb-2">
                                    📷
                                </div>
                                <p className="text-sm font-bold text-dark mb-0.5">
                                    Tocar acá para sacar foto o elegir de la galería
                                </p>
                                <p className="text-[11px] text-dark/50">
                                    Podés seleccionar una o varias imágenes a la vez
                                </p>
                            </div>

                            {/* Previews Grid */}
                            {selectedFiles.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-semibold text-dark/70 mb-2">
                                        Fotos seleccionadas ({selectedFiles.length}):
                                    </p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {selectedFiles.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="relative aspect-square rounded-xl overflow-hidden border border-pastel group shadow-xs bg-dark/5"
                                            >
                                                <img
                                                    src={item.preview}
                                                    alt="preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(idx)}
                                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-dark/70 text-white flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-colors shadow-sm cursor-pointer"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Optional Notes */}
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-dark/70 mb-1.5">
                                    Comentario u observación (opcional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Ej: Radiografía panorámica que me saqué el martes..."
                                    rows={2}
                                    className="w-full bg-pastel-light/30 border border-pastel rounded-xl p-3 text-xs text-dark placeholder:text-dark/40 focus:outline-none focus:border-accent"
                                />
                            </div>

                            {/* Progress bar if uploading */}
                            {uploading && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-dark/60 mb-1 font-medium">
                                        <span>Subiendo imágenes...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full bg-pastel rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-accent h-2 transition-all duration-300 rounded-full"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={selectedFiles.length === 0 || uploading}
                                className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                                    selectedFiles.length === 0 || uploading
                                        ? 'bg-pastel text-dark/40 cursor-not-allowed'
                                        : 'bg-accent hover:bg-accent-hover text-dark shadow-md hover:scale-[1.01]'
                                }`}
                            >
                                {uploading ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4 text-dark" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        <span>Enviando fotos...</span>
                                    </>
                                ) : (
                                    <span>Enviar {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''} al consultorio</span>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Footer info */}
            <div className="text-center text-[11px] text-dark/40 py-2">
                Protegido por DentApp · Los archivos se transmiten de forma cifrada
            </div>
        </div>
    )
}

export default PatientUpload
