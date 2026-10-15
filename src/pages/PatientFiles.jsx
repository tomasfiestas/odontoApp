import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonList } from '../components/Skeleton'

const CATEGORIES = [
    { id: 'todas', label: 'Todas', icon: '📁' },
    { id: 'radiografia', label: 'Radiografías', icon: '🩻' },
    { id: 'foto_clinica', label: 'Fotos Clínicas', icon: '📸' },
    { id: 'consentimiento', label: 'Consentimientos', icon: '📑' },
    { id: 'estudio', label: 'Estudios / Informes', icon: '📄' },
]

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PatientFiles = () => {
    const { id: patientId } = useParams()
    const { showToast } = useToast()
    const fileInputRef = useRef(null)

    const [patient, setPatient] = useState(null)
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState('todas')

    // Upload state
    const [isDragging, setIsDragging] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadType, setUploadType] = useState('radiografia')
    const [uploadNotes, setUploadNotes] = useState('')

    // Lightbox state
    const [activeImageIndex, setActiveImageIndex] = useState(null)
    const [zoomLevel, setZoomLevel] = useState(1)
    const [rotation, setRotation] = useState(0)

    // Delete state
    const [fileToDelete, setFileToDelete] = useState(null)
    const [deleting, setDeleting] = useState(false)

    // Share link modal / state
    const [shareModalOpen, setShareModalOpen] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { data: pData } = await supabase
                .from('patients')
                .select('id, first_name, last_name, dni, phone, clinic_id, clinics(name)')
                .eq('id', patientId)
                .single()

            if (pData) setPatient(pData)

            const { data: fData, error: fError } = await supabase
                .from('patient_files')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })

            if (fError) {
                console.warn('Error fetching files (verificar si se ejecutó 03_patient_files.sql):', fError)
            } else if (fData) {
                setFiles(fData)
            }
        } catch (err) {
            console.error('Error fetching data:', err)
        } finally {
            setLoading(false)
        }
    }, [patientId])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Keyboard navigation for Lightbox
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (activeImageIndex === null) return
            if (e.key === 'Escape') closeLightbox()
            if (e.key === 'ArrowRight') nextImage()
            if (e.key === 'ArrowLeft') prevImage()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    })

    const handleFilesUpload = async (fileList) => {
        if (!fileList || fileList.length === 0) return
        setUploading(true)
        setUploadProgress(10)

        const filesArray = Array.from(fileList)
        let successCount = 0

        for (let i = 0; i < filesArray.length; i++) {
            const file = filesArray[i]
            try {
                const ext = file.name.split('.').pop()
                const cleanExt = ext ? ext.toLowerCase() : 'jpg'
                const storagePath = `${patientId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`

                // 1. Upload to Supabase Storage
                const { error: uploadErr } = await supabase.storage
                    .from('patient-files')
                    .upload(storagePath, file, { cacheControl: '3600', upsert: false })

                if (uploadErr) {
                    console.error('Storage upload error:', uploadErr)
                    throw uploadErr
                }

                // 2. Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('patient-files')
                    .getPublicUrl(storagePath)

                // Determine file type category
                let inferredType = uploadType
                if (file.type.includes('pdf')) {
                    inferredType = 'consentimiento'
                }

                // 3. Save reference in DB
                const { error: dbErr } = await supabase.from('patient_files').insert({
                    patient_id: patientId,
                    clinic_id: patient?.clinic_id || null,
                    file_name: file.name,
                    file_url: publicUrl,
                    file_type: inferredType,
                    mime_type: file.type,
                    size_bytes: file.size,
                    source: 'doctor',
                    notes: uploadNotes.trim() || null,
                })

                if (dbErr) throw dbErr
                successCount++
                setUploadProgress(Math.round(((i + 1) / filesArray.length) * 100))
            } catch (err) {
                console.error(`Error uploading ${file.name}:`, err)
                showToast(`Error al subir ${file.name}. Asegurate de haber ejecutado 03_patient_files.sql en Supabase.`, 'error')
            }
        }

        setUploading(false)
        setUploadProgress(0)
        setUploadNotes('')
        if (fileInputRef.current) fileInputRef.current.value = ''

        if (successCount > 0) {
            showToast(`${successCount} archivo${successCount > 1 ? 's' : ''} subido${successCount > 1 ? 's' : ''} correctamente`, 'success')
            fetchData()
        }
    }

    const handleDeleteFile = async () => {
        if (!fileToDelete) return
        setDeleting(true)
        try {
            // Delete record from DB
            const { error: dbErr } = await supabase
                .from('patient_files')
                .delete()
                .eq('id', fileToDelete.id)

            if (dbErr) throw dbErr

            // Try to delete from storage if URL contains the bucket path
            try {
                const urlParts = fileToDelete.file_url.split('/patient-files/')
                if (urlParts.length > 1) {
                    const storagePath = decodeURIComponent(urlParts[1])
                    await supabase.storage.from('patient-files').remove([storagePath])
                }
            } catch (storageErr) {
                console.warn('Storage delete warning:', storageErr)
            }

            showToast('Archivo eliminado', 'info')
            setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id))
            if (activeImageIndex !== null) closeLightbox()
        } catch (err) {
            console.error('Error deleting file:', err)
            showToast('Error al eliminar el archivo', 'error')
        } finally {
            setDeleting(false)
            setFileToDelete(null)
        }
    }

    // Drag and Drop handlers
    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFilesUpload(e.dataTransfer.files)
        }
    }

    // Filter files
    const filteredFiles = files.filter((f) => {
        if (selectedCategory === 'todas') return true
        return f.file_type === selectedCategory
    })

    // Image-only list for Lightbox navigation
    const imageFiles = filteredFiles.filter((f) => f.mime_type?.startsWith('image/') || f.file_url.match(/\.(jpg|jpeg|png|webp|gif)/i))

    const openLightbox = (file) => {
        const idx = imageFiles.findIndex((img) => img.id === file.id)
        if (idx !== -1) {
            setActiveImageIndex(idx)
            setZoomLevel(1)
            setRotation(0)
        }
    }

    const closeLightbox = () => {
        setActiveImageIndex(null)
        setZoomLevel(1)
        setRotation(0)
    }

    const nextImage = () => {
        if (imageFiles.length === 0) return
        setActiveImageIndex((prev) => (prev + 1) % imageFiles.length)
        setZoomLevel(1)
        setRotation(0)
    }

    const prevImage = () => {
        if (imageFiles.length === 0) return
        setActiveImageIndex((prev) => (prev - 1 + imageFiles.length) % imageFiles.length)
        setZoomLevel(1)
        setRotation(0)
    }

    // Share link generation
    const patientUploadUrl = `${window.location.origin}/pacientes/${patientId}/subir-archivos`

    const copyShareLink = () => {
        navigator.clipboard.writeText(patientUploadUrl)
        showToast('Enlace copiado al portapapeles', 'success')
    }

    const openWhatsAppShare = () => {
        const cleanPhone = (patient?.phone || '').replace(/\D/g, '')
        const msg = encodeURIComponent(
            `Hola ${patient?.first_name || ''}! Te comparto este enlace para que puedas subir fotos de tus radiografías o estudios médicos a tu ficha de atención en la clínica:\n\n${patientUploadUrl}`
        )
        const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : `https://wa.me/?text=${msg}`
        window.open(waUrl, '_blank')
    }

    if (loading) {
        return <SkeletonList count={4} />
    }

    const currentLightboxImage = activeImageIndex !== null ? imageFiles[activeImageIndex] : null

    return (
        <div className="pb-16">
            {/* Header with Back button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
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
                        🩻 Radiografías y Archivos
                    </h1>
                    <p className="text-sm text-dark/50 mt-0.5">
                        Paciente: <strong className="text-dark font-medium">{patient?.last_name}, {patient?.first_name}</strong> · DNI: {patient?.dni}
                    </p>
                </div>

                {/* Patient link share button */}
                <button
                    onClick={() => setShareModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-accent/20 hover:bg-accent text-dark font-semibold px-4 py-2.5 rounded-xl border border-accent/40 shadow-sm transition-all duration-200 cursor-pointer text-sm"
                >
                    <svg className="w-4 h-4 text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Pedir fotos al paciente
                </button>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`bg-white rounded-2xl border-2 border-dashed p-6 sm:p-8 mb-8 text-center transition-all duration-200 ${
                    isDragging
                        ? 'border-accent bg-accent/10 shadow-lg scale-[1.01]'
                        : 'border-pastel hover:border-accent/60 bg-pastel-light/30'
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFilesUpload(e.target.files)}
                />

                <div className="max-w-md mx-auto">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/20 text-dark flex items-center justify-center text-2xl mb-3 shadow-inner">
                        {uploading ? (
                            <svg className="animate-spin w-6 h-6 text-dark" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        ) : (
                            '📤'
                        )}
                    </div>

                    <h3 className="text-base font-bold text-dark mb-1">
                        {uploading ? 'Subiendo archivos...' : 'Arrastrá radiografías, fotos o estudios acá'}
                    </h3>
                    <p className="text-xs text-dark/50 mb-4">
                        Soporta imágenes JPG, PNG, WEBP y documentos PDF (hasta 25MB)
                    </p>

                    {/* Quick controls row: Category selector & Browse button */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-3">
                        <select
                            value={uploadType}
                            onChange={(e) => setUploadType(e.target.value)}
                            disabled={uploading}
                            className="bg-white border border-pastel rounded-xl px-3 py-2 text-xs font-medium text-dark focus:outline-none focus:border-accent"
                        >
                            <option value="radiografia">🩻 Tipo: Radiografía</option>
                            <option value="foto_clinica">📸 Tipo: Foto Clínica</option>
                            <option value="consentimiento">📑 Tipo: Consentimiento / Doc</option>
                            <option value="estudio">📄 Tipo: Estudio Externo</option>
                        </select>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="bg-accent hover:bg-accent-hover text-dark font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
                        >
                            Seleccionar desde mi PC
                        </button>
                    </div>

                    {uploading && (
                        <div className="w-full bg-pastel rounded-full h-2 mt-4 overflow-hidden">
                            <div
                                className="bg-accent h-2 transition-all duration-300 rounded-full"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
                {CATEGORIES.map((cat) => {
                    const count = cat.id === 'todas'
                        ? files.length
                        : files.filter((f) => f.file_type === cat.id).length

                    const isActive = selectedCategory === cat.id

                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                isActive
                                    ? 'bg-dark text-white shadow-sm'
                                    : 'bg-white border border-pastel text-dark/70 hover:bg-pastel-light hover:text-dark'
                            }`}
                        >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                            <span
                                className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-pastel text-dark/60'
                                }`}
                            >
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Files Gallery Grid */}
            {filteredFiles.length === 0 ? (
                <div className="bg-white rounded-2xl border border-pastel p-12 text-center max-w-lg mx-auto">
                    <div className="text-4xl mb-3">🩻</div>
                    <h3 className="text-base font-bold text-dark mb-1">No hay archivos en esta categoría</h3>
                    <p className="text-xs text-dark/50 mb-5">
                        Podés subir radiografías desde tu computadora o enviarle un link al paciente para que las suba con su celular.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-accent hover:bg-accent-hover text-dark font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                        >
                            Subir archivo
                        </button>
                        <button
                            onClick={() => setShareModalOpen(true)}
                            className="bg-pastel-light hover:bg-pastel text-dark font-medium px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer border border-pastel"
                        >
                            Pedir al paciente
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredFiles.map((file) => {
                        const isImage = file.mime_type?.startsWith('image/') || file.file_url.match(/\.(jpg|jpeg|png|webp|gif)/i)
                        const categoryObj = CATEGORIES.find((c) => c.id === file.file_type) || CATEGORIES[1]

                        return (
                            <div
                                key={file.id}
                                className="bg-white rounded-2xl border border-pastel overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group"
                            >
                                {/* Thumbnail / Preview */}
                                <div
                                    onClick={() => isImage && openLightbox(file)}
                                    className={`relative aspect-4/3 bg-dark/5 overflow-hidden flex items-center justify-center ${
                                        isImage ? 'cursor-pointer' : ''
                                    }`}
                                >
                                    {isImage ? (
                                        <>
                                            <img
                                                src={file.file_url}
                                                alt={file.file_name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                loading="lazy"
                                            />
                                            {/* Hover overlay with zoom icon */}
                                            <div className="absolute inset-0 bg-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                <div className="p-2 rounded-full bg-white/20 backdrop-blur-xs">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-4">
                                            <div className="w-12 h-12 mx-auto rounded-xl bg-red-100 text-error flex items-center justify-center font-bold text-lg mb-2">
                                                PDF
                                            </div>
                                            <span className="text-xs text-dark/60 font-medium block truncate max-w-[160px]">
                                                {file.file_name}
                                            </span>
                                        </div>
                                    )}

                                    {/* Source badge (Doctor / Paciente) */}
                                    <div className="absolute top-2 left-2">
                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs backdrop-blur-xs ${
                                                file.source === 'patient'
                                                    ? 'bg-purple-600/90 text-white'
                                                    : 'bg-dark/70 text-white'
                                            }`}
                                        >
                                            {file.source === 'patient' ? '📸 Paciente' : '👨‍⚕️ Doctor'}
                                        </span>
                                    </div>
                                </div>

                                {/* Content Info */}
                                <div className="p-3.5 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="text-[11px] font-semibold text-accent-hover flex items-center gap-1">
                                                <span>{categoryObj.icon}</span>
                                                <span>{categoryObj.label}</span>
                                            </span>
                                            <span className="text-[10px] text-dark/40">{formatDate(file.created_at)}</span>
                                        </div>
                                        <p className="text-xs font-semibold text-dark truncate" title={file.file_name}>
                                            {file.file_name}
                                        </p>
                                        {file.notes && (
                                            <p className="text-[11px] text-dark/60 line-clamp-2 mt-1 italic">
                                                "{file.notes}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions footer */}
                                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-pastel/50">
                                        <span className="text-[10px] text-dark/40">
                                            {formatFileSize(file.size_bytes)}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <a
                                                href={file.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                download={file.file_name}
                                                className="p-1.5 rounded-lg text-dark/50 hover:text-dark hover:bg-pastel transition-colors"
                                                title="Descargar o abrir en pestaña"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                            </a>
                                            <button
                                                onClick={() => setFileToDelete(file)}
                                                className="p-1.5 rounded-lg text-dark/40 hover:text-error hover:bg-red-50 transition-colors cursor-pointer"
                                                title="Eliminar archivo"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Lightbox / Negatoscopio Digital */}
            {currentLightboxImage && (
                <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 backdrop-blur-xs select-none">
                    {/* Top bar controls */}
                    <div className="flex items-center justify-between text-white py-2 px-4 border-b border-white/10">
                        <div className="flex items-center gap-3 truncate">
                            <span className="text-sm font-semibold truncate max-w-xs sm:max-w-md">
                                {currentLightboxImage.file_name}
                            </span>
                            <span className="text-xs text-white/50">
                                ({activeImageIndex + 1} de {imageFiles.length})
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Zoom controls */}
                            <button
                                onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                title="Acercar zoom"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                title="Alejar zoom"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setRotation((r) => (r + 90) % 360)}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                title="Girar 90°"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                            <a
                                href={currentLightboxImage.file_url}
                                download={currentLightboxImage.file_name}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                title="Descargar original"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </a>
                            <button
                                onClick={closeLightbox}
                                className="p-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors ml-2 cursor-pointer"
                                title="Cerrar (Esc)"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Central Viewing Stage */}
                    <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
                        {/* Prev Button */}
                        {imageFiles.length > 1 && (
                            <button
                                onClick={prevImage}
                                className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}

                        {/* Image canvas */}
                        <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                            <img
                                src={currentLightboxImage.file_url}
                                alt={currentLightboxImage.file_name}
                                style={{
                                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                                    transition: 'transform 0.15s ease-out',
                                    maxHeight: '85vh',
                                    maxWidth: '85vw',
                                }}
                                className="object-contain rounded-md shadow-2xl"
                            />
                        </div>

                        {/* Next Button */}
                        {imageFiles.length > 1 && (
                            <button
                                onClick={nextImage}
                                className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="bg-white/5 rounded-xl px-4 py-2.5 text-white/70 text-xs flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span>📅 {formatDate(currentLightboxImage.created_at)}</span>
                            <span>📦 {formatFileSize(currentLightboxImage.size_bytes)}</span>
                            <span>{currentLightboxImage.source === 'patient' ? '📸 Subido por paciente' : '👨‍⚕️ Subido por clínica'}</span>
                        </div>
                        {currentLightboxImage.notes && (
                            <p className="text-white italic">"{currentLightboxImage.notes}"</p>
                        )}
                    </div>
                </div>
            )}

            {/* Share Link Modal */}
            {shareModalOpen && (
                <div className="fixed inset-0 z-50 bg-dark/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-pastel">
                        <div className="text-center mb-5">
                            <div className="w-12 h-12 mx-auto rounded-full bg-accent/20 flex items-center justify-center text-2xl mb-2">
                                📲
                            </div>
                            <h3 className="text-lg font-bold text-dark">Pedir fotos o radiografías al paciente</h3>
                            <p className="text-xs text-dark/50 mt-1">
                                Compartí este enlace para que {patient?.first_name} pueda sacar fotos con su celular y subirlas directo a su ficha.
                            </p>
                        </div>

                        {/* Link Box */}
                        <div className="bg-pastel-light/60 p-3 rounded-xl border border-pastel mb-4">
                            <p className="text-xs font-mono text-dark break-all select-all">
                                {patientUploadUrl}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={openWhatsAppShare}
                                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer shadow-sm"
                            >
                                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                </svg>
                                Enviar por WhatsApp
                            </button>

                            <button
                                onClick={copyShareLink}
                                className="w-full flex items-center justify-center gap-2 bg-pastel-light hover:bg-pastel text-dark font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer border border-pastel"
                            >
                                <svg className="w-4 h-4 text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                                Copiar enlace
                            </button>

                            <button
                                onClick={() => setShareModalOpen(false)}
                                className="w-full text-center py-2 text-xs text-dark/50 hover:text-dark transition-colors cursor-pointer mt-1"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmDialog
                isOpen={!!fileToDelete}
                title="Eliminar archivo"
                message={`¿Estás seguro de que querés eliminar "${fileToDelete?.file_name}"? Esta acción borrará la imagen de forma permanente.`}
                confirmLabel={deleting ? 'Eliminando...' : 'Eliminar'}
                onConfirm={handleDeleteFile}
                onCancel={() => setFileToDelete(null)}
            />
        </div>
    )
}

export default PatientFiles
