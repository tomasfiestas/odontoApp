import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppointmentModal from '../components/AppointmentModal'

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const statusColors = {
    pendiente: 'bg-accent',
    confirmado: 'bg-blue-400',
    completado: 'bg-success',
    cancelado: 'bg-error',
}

const statusLabels = {
    pendiente: { label: 'Pendiente', bg: 'bg-accent/15', text: 'text-accent-hover' },
    confirmado: { label: 'Confirmado', bg: 'bg-blue-500/15', text: 'text-blue-600' },
    completado: { label: 'Completado', bg: 'bg-success/10', text: 'text-success' },
    cancelado: { label: 'Cancelado', bg: 'bg-error/10', text: 'text-error' },
}

const Calendar = () => {
    const { user } = useAuth()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [appointments, setAppointments] = useState([])
    const [clinics, setClinics] = useState([])
    const [clinicFilter, setClinicFilter] = useState('')
    const [selectedDay, setSelectedDay] = useState(null)
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // Load clinics
    useEffect(() => {
        const fetchClinics = async () => {
            const { data } = await supabase
                .from('doctor_clinics')
                .select('clinic_id, clinics(id, name)')
                .eq('doctor_id', user.id)
            if (data) setClinics(data.map((dc) => dc.clinics))
        }
        fetchClinics()
    }, [user.id])

    // Load appointments for current month
    const fetchAppointments = useCallback(async () => {
        setLoading(true)
        const startDate = new Date(year, month, 1).toISOString().split('T')[0]
        const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

        let query = supabase
            .from('appointments')
            .select('*, patients(first_name, last_name), clinics(name)')
            .eq('doctor_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('time', { ascending: true })

        if (clinicFilter) {
            query = query.eq('clinic_id', clinicFilter)
        }

        const { data } = await query
        if (data) setAppointments(data)
        setLoading(false)
    }, [year, month, clinicFilter, user.id])

    useEffect(() => {
        fetchAppointments()
    }, [fetchAppointments])

    const handleAppointmentSaved = () => {
        fetchAppointments()
    }

    // Map: dateString -> appointments
    const appointmentsByDay = useMemo(() => {
        const map = {}
        appointments.forEach((apt) => {
            if (!map[apt.date]) map[apt.date] = []
            map[apt.date].push(apt)
        })
        return map
    }, [appointments])

    // Calendar grid
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1)
        let startDow = firstDay.getDay() - 1 // Monday = 0
        if (startDow < 0) startDow = 6

        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const days = []

        // Empty cells before first day
        for (let i = 0; i < startDow; i++) {
            days.push(null)
        }

        // Day cells
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            days.push({
                day: d,
                dateStr,
                appointments: appointmentsByDay[dateStr] || [],
            })
        }

        return days
    }, [year, month, appointmentsByDay])

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const selectedAppointments = selectedDay ? (appointmentsByDay[selectedDay] || []) : []

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-dark">Calendario</h1>
                    <p className="text-sm text-dark/50 mt-0.5">Vista mensual de turnos</p>
                </div>
                <select
                    value={clinicFilter}
                    onChange={(e) => setClinicFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-soft bg-white text-sm text-dark
                     focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                >
                    <option value="">Todas las clínicas</option>
                    {clinics.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4 bg-white rounded-2xl border border-pastel p-3">
                <button
                    onClick={prevMonth}
                    className="p-2 rounded-xl hover:bg-gray-soft text-dark/50 hover:text-dark transition-colors cursor-pointer"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-lg font-semibold text-dark">
                    {MONTHS[month]} {year}
                </h2>
                <button
                    onClick={nextMonth}
                    className="p-2 rounded-xl hover:bg-gray-soft text-dark/50 hover:text-dark transition-colors cursor-pointer"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Calendar grid */}
            <div className="bg-white rounded-2xl border border-pastel overflow-hidden mb-6">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-gray-soft">
                    {DAYS.map((d) => (
                        <div key={d} className="py-2.5 text-center text-xs font-semibold text-dark/40 uppercase tracking-wider">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                    {calendarDays.map((cell, idx) => {
                        if (!cell) {
                            return <div key={`empty-${idx}`} className="min-h-[60px] sm:min-h-[80px] border-b border-r border-gray-soft/50" />
                        }

                        const isToday = cell.dateStr === todayStr
                        const isSelected = cell.dateStr === selectedDay
                        const hasAppointments = cell.appointments.length > 0

                        return (
                            <button
                                key={cell.dateStr}
                                onClick={() => setSelectedDay(isSelected ? null : cell.dateStr)}
                                className={`min-h-[60px] sm:min-h-[80px] p-1.5 sm:p-2 border-b border-r border-gray-soft/50 text-left
                           transition-all duration-150 cursor-pointer relative
                           ${isSelected ? 'bg-accent/10 ring-2 ring-accent/30 ring-inset' : 'hover:bg-pastel-light'}
                           ${isToday ? '' : ''}`}
                            >
                                <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm font-medium
                                  ${isToday ? 'bg-accent text-dark font-bold' : 'text-dark/70'}`}>
                                    {cell.day}
                                </span>

                                {/* Dots */}
                                {hasAppointments && (
                                    <div className="flex gap-0.5 mt-0.5 flex-wrap">
                                        {cell.appointments.slice(0, 3).map((apt, i) => (
                                            <span
                                                key={i}
                                                className={`w-1.5 h-1.5 rounded-full ${statusColors[apt.status] || 'bg-accent'}`}
                                            />
                                        ))}
                                        {cell.appointments.length > 3 && (
                                            <span className="text-[9px] text-dark/30 ml-0.5">+{cell.appointments.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Selected day panel */}
            {selectedDay && (
                <div className="bg-white rounded-2xl border border-pastel p-5 mb-6 animate-in">
                    <h3 className="text-sm font-semibold text-dark mb-3">
                        Turnos del {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </h3>

                    {selectedAppointments.length === 0 ? (
                        <div className="text-center py-4">
                            <p className="text-sm text-dark/40 mb-3">No hay turnos para este día</p>
                            <button
                                onClick={() => setModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-dark text-sm font-semibold
                                           hover:bg-accent-hover active:scale-[0.98] transition-all duration-200 cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Agendar turno
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                {selectedAppointments.map((apt) => {
                                    const st = statusLabels[apt.status] || statusLabels.pendiente
                                    return (
                                        <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-soft/50 hover:bg-gray-soft transition-colors">
                                            {/* Time */}
                                            <div className="text-sm font-semibold text-dark w-12 shrink-0">
                                                {apt.time || '—'}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-dark truncate">
                                                    {apt.patients?.last_name}, {apt.patients?.first_name}
                                                </p>
                                                <p className="text-xs text-dark/40 truncate">{apt.treatment}</p>
                                            </div>

                                            {/* Source badge */}
                                            {apt.source === 'historia_clinica' && (
                                                <span className="hidden sm:inline text-[10px] font-medium bg-pastel text-dark/40 px-1.5 py-0.5 rounded">
                                                    HC
                                                </span>
                                            )}

                                            {/* Status */}
                                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-lg ${st.bg} ${st.text}`}>
                                                {st.label}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                            <button
                                onClick={() => setModalOpen(true)}
                                className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-accent/40
                                       text-sm font-medium text-dark/50 hover:text-dark hover:border-accent hover:bg-pastel-light
                                       transition-all duration-200 cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Agendar otro turno
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center flex-wrap gap-4 text-xs text-dark/40 pb-24 md:pb-4">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Pendiente</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Confirmado</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" /> Completado</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error" /> Cancelado</span>
            </div>



            {/* Appointment Modal */}
            <AppointmentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={handleAppointmentSaved}
                defaultDate={selectedDay || ''}
            />
        </div>
    )
}

export default Calendar
