import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Odontogram from '../components/Odontogram'

const PatientOdontogram = () => {
    const { id } = useParams()
    const [patient, setPatient] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPatient = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('patients')
                .select('first_name, last_name, dni')
                .eq('id', id)
                .single()

            if (!error && data) {
                setPatient(data)
            }
            setLoading(false)
        }

        fetchPatient()
    }, [id])

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-6 w-32 bg-gray-soft rounded mb-6"></div>
                <div className="h-24 bg-white rounded-2xl border border-pastel mb-6"></div>
                <div className="h-96 bg-white rounded-2xl border border-pastel"></div>
            </div>
        )
    }

    if (!patient) {
        return (
            <div className="text-center py-20">
                <p className="text-dark/50 font-medium">Paciente no encontrado</p>
                <Link to="/patients" className="text-accent hover:underline text-sm mt-2 inline-block">
                    Volver a pacientes
                </Link>
            </div>
        )
    }

    return (
        <div>
            {/* Header / Back */}
            <div className="mb-6">
                <Link 
                    to={`/patients/${id}`} 
                    className="inline-flex items-center gap-1.5 text-sm text-dark/50 hover:text-dark transition-colors mb-4"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver al perfil
                </Link>
                <h1 className="text-2xl font-bold text-dark">
                    Odontograma: {patient.last_name}, {patient.first_name}
                </h1>
                <p className="text-dark/50 text-sm mt-1">DNI: {patient.dni}</p>
            </div>

            {/* Odontogram Component */}
            <div className="mb-10">
                <Odontogram patientId={id} />
            </div>
        </div>
    )
}

export default PatientOdontogram
