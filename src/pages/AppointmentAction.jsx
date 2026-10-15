import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const AppointmentAction = () => {
    const [searchParams] = useSearchParams()
    const [status, setStatus] = useState('loading') // loading, success-confirm, success-cancel, error, invalid
    
    useEffect(() => {
        const processAction = async () => {
            const id = searchParams.get('id')
            const action = searchParams.get('action')

            if (!id || (action !== 'confirm' && action !== 'cancel')) {
                setStatus('invalid')
                return
            }

            const dbStatus = action === 'confirm' ? 'confirmado' : 'cancelado'

            try {
                // Call the RPC function we created in 02_email_automation.sql
                const { data, error } = await supabase.rpc('update_appointment_status', {
                    apt_id: id,
                    new_status: dbStatus
                })

                if (error) throw error

                if (data === true) {
                    setStatus(action === 'confirm' ? 'success-confirm' : 'success-cancel')
                } else {
                    // It returns false if appointment wasn't found or wasn't 'pendiente'
                    setStatus('error')
                }
            } catch (err) {
                console.error(err)
                setStatus('error')
            }
        }

        processAction()
    }, [searchParams])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-pastel max-w-md w-full text-center">
                {/* Tooth Logo (can reuse or just SVG) */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center text-3xl">
                        🦷
                    </div>
                </div>

                {status === 'loading' && (
                    <>
                        <h1 className="text-xl font-bold text-dark mb-2">Procesando...</h1>
                        <p className="text-dark/60 text-sm">Por favor, espera un momento.</p>
                        <div className="mt-6 flex justify-center">
                            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    </>
                )}

                {status === 'success-confirm' && (
                    <>
                        <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                            ✓
                        </div>
                        <h1 className="text-2xl font-bold text-dark mb-2">¡Turno Confirmado!</h1>
                        <p className="text-dark/60 text-sm">Tu asistencia ha sido confirmada exitosamente. Te esperamos en la clínica.</p>
                    </>
                )}

                {status === 'success-cancel' && (
                    <>
                         <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                            ×
                        </div>
                        <h1 className="text-2xl font-bold text-dark mb-2">Turno Cancelado</h1>
                        <p className="text-dark/60 text-sm">Tu turno ha sido cancelado correctamente. Gracias por avisarnos.</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                            !
                        </div>
                        <h1 className="text-xl font-bold text-dark mb-2">Algo salió mal</h1>
                        <p className="text-dark/60 text-sm">Es posible que el turno ya haya sido modificado, no exista, o haya ocurrido un error. Por favor, contáctate con la clínica.</p>
                    </>
                )}

                {status === 'invalid' && (
                    <>
                        <h1 className="text-xl font-bold text-dark mb-2">Enlace inválido</h1>
                        <p className="text-dark/60 text-sm">El enlace que has seguido no es válido o está incompleto.</p>
                    </>
                )}
            </div>
        </div>
    )
}

export default AppointmentAction
