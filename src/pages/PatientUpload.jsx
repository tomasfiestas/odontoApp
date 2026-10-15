import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const PatientUpload = () => {
    const { token: urlToken, id: urlId } = useParams()
    const tokenOrId = urlToken || urlId

    const fileInputRef = useRef(null)

    const [patient, setPatient] = useState(null)
    const [tokenRecord, setTokenRecord] = useState(null)
    const [loading, setLoading] = useState(true)
    const [linkState, setLinkState] = useState('valid') // 'valid' | 'already_used' | 'expired' | 'invalid'
    const [errorMessage, setErrorMessage] = useState(null)

    // Form states
    const [selectedFiles, setSelectedFiles] = useState([])
    const [uploadType, setUploadType] = useState('radiografia')
    const [notes, setNotes] = useState('')
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [submitted, setSubmitted] = useState(false)

    useEffect(() => {
        const validateTokenAndFetchPatient = async () => {
            setLoading(true)
            setLinkState('valid')
            setErrorMessage(null)

            try {
                // 1. Try to find by token in patient_upload_tokens
                const { data: tData, error: tError } = await supabase
                    .from('patient_upload_tokens')
                    .select('id, token, used, used_at, expires_at, patient_id, patients(id, first_name, last_name, clinic_id, clinics(name))')
                    .eq('token', tokenOrId)
                    .single()

                if (tData) {
                    setTokenRecord(tData)
                    setPatient(tData.patients)

                    // Check if already used
                    if (tData.used) {
                        setLinkState('already_used')
                        setLoading(false)
                        return
                    }

                    // Check if expired
                    if (new Date(tData.expires_at) < new Date()) {
                        setLinkState('expired')
                        setLoading(false)
                        return
                    }

                    setLinkState('valid')
                    setLoading(false)
                    return
                }

                // 2. Fallback: try searching directly by patient_id
                const { data: pData, error: pError } = await supabase
                    .from('patients')
                    .select('id, first_name, last_name, clinic_id, clinics(name)')
                    .eq('id', tokenOrId)
                    .single()

                if (pData) {
                    setPatient(pData)
                    setLinkState('valid')
                } else {
                    setLinkState('invalid')
                    setErrorMessage('No encontramos ninguna solicitud de archivos asociada a este enlace.')
                }
            } catch (err) {
                console.error('Error validating upload link:', err)
                setLinkState('invalid')
                setErrorMessage('Ocurrió un error al verificar el enlace.')
            } finally {
                setLoading(false)
            }
        }

        if (tokenOrId) {
            validateTokenAndFetchPatient()
        }
    }, [tokenOrId])

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || [])
        // Strictly filter images
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
        if (selectedFiles.length === 0 || !patient) return

        setUploading(true)
        setProgress(10)
        setErrorMessage(null)

        try {
            const patientId = patient.id
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

            // 4. Burn / Mark token as used so it cannot be reused!
            if (tokenRecord?.id) {
                await supabase
                    .from('patient_upload_tokens')
                    .update({
                        used: true,
                        used_at: new Date().toISOString()
                    })
                    .eq('id', tokenRecord.id)
            }

            setSubmitted(true)
        } catch (err) {
            console.error('Error al subir:', err)
            setErrorMessage('Hubo un problema al subir las fotos. Por favor intentalo nuevamente.')
        } finally {
            setUploading(false)
        }
    }

    // Loading View
    if (loading) {
        return (
            <div className="min-h-screen bg-pastel-light/40 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center border border-pastel shadow-sm">
                    <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-sm font-medium text-dark/60">Verificando enlace seguro...</p>
                </div>
            </div>
        )
    }

    // Link Already Used View
    if (linkState === 'already_used') {
        return (
            <div className="min-h-screen bg-pastel-light/30 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-pastel shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-3xl mx-auto mb-4">
                        🔒
                    </div>
                    <h2 className="text-xl font-bold text-dark mb-2">Enlace ya utilizado</h2>
                    <p className="text-sm text-dark/70 mb-4 leading-relaxed">
                        Este enlace de subida era de <strong>un solo uso</strong> y ya fue completado previamente para la ficha de <strong className="text-dark">{patient?.first_name} {patient?.last_name}</strong>.
                    </p>
                    <div className="bg-pastel-light/50 rounded-2xl p-4 text-xs text-dark/60 border border-pastel text-left mb-6">
                        <p className="font-semibold text-dark mb-1">ℹ️ ¿Por qué ocurre esto?</p>
                        <p>Por seguridad y protección de tus datos médicos, cada enlace se desactiva permanentemente una vez enviadas las fotos para evitar duplicaciones o usos no autorizados.</p>
                    </div>
                    <p className="text-xs text-dark/40">
                        Si necesitás enviar más estudios o radiografías, contactate con la clínica para que te generen un nuevo enlace.
                    </p>
                </div>
            </div>
        )
    }

    // Link Expired View
    if (linkState === 'expired') {
        return (
            <div className="min-h-screen bg-pastel-light/30 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-pastel shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-red-100 text-error flex items-center justify-center text-3xl mx-auto mb-4">
                        ⏳
                    </div>
                    <h2 className="text-xl font-bold text-dark mb-2">Enlace expirado</h2>
                    <p className="text-sm text-dark/70 mb-6 leading-relaxed">
                        Este enlace de subida tenía una validez temporal de 48 horas y ha caducado.
                    </p>
                    <p className="text-xs text-dark/40">
                        Por favor pedile a tu odontólogo que te genere un nuevo enlace para subir tus archivos.
                    </p>
                </div>
            </div>
        )
    }

    // Invalid Link View
    if (linkState === 'invalid' || !patient) {
        return (
            <div className="min-h-screen bg-pastel-light/30 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-pastel shadow-sm">
                    <div className="text-4xl mb-3">⚠️</div>
                    <h2 className="text-lg font-bold text-dark mb-2">Enlace no válido</h2>
                    <p className="text-sm text-dark/60 mb-6">{errorMessage || 'El enlace que intentás abrir no existe o no es correcto.'}</p>
                    <p className="text-xs text-dark/40">Por favor contactate con la clínica para solicitar un enlace válido.</p>
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
                            <p className="text-sm text-dark/60 mb-4 leading-relaxed">
                                Muchas gracias, <strong className="text-dark">{patient?.first_name}</strong>. Tus fotos fueron adjuntadas directamente a tu ficha médica para tu próxima atención.
                            </p>

                            <div className="bg-pastel-light/60 border border-pastel rounded-2xl p-4 text-xs text-dark/60 mb-6">
                                🔒 Este enlace de un solo uso ha sido completado y desactivado. Ya podés cerrar esta ventana.
                            </div>
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

                            {/* Single-use badge notice */}
                            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/60 rounded-xl px-3 py-2 mb-4 text-[11px] text-amber-900 font-medium">
                                <span>🔒</span>
                                <span>Enlace seguro de un solo uso (se desactiva al enviar)</span>
                            </div>

                            {errorMessage && (
                                <div className="p-3 mb-4 rounded-xl bg-error/10 text-error text-xs font-medium">
                                    {errorMessage}
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
                                    placeholder="Ej: Radiografía panorámica de hoy..."
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
                Protegido por DentApp · Enlace cifrado de un solo uso
            </div>
        </div>
    )
}

export default PatientUpload
