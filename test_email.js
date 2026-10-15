import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const APP_URL = Deno.env.get('APP_URL') || 'http://localhost:5173'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  try {
    // 1. Obtener todos los doctores (perfiles) que tienen las notificaciones activadas
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, reminder_days_advance')
      .eq('email_reminders', true)

    if (profilesError) throw profilesError

    let emailsSent = 0;

    // 2. Para cada doctor, buscar los turnos próximos
    for (const profile of profiles) {
      const daysAdvance = profile.reminder_days_advance || 2
      
      // Calcular la fecha objetivo (hoy + daysAdvance)
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + daysAdvance)
      const targetDateString = targetDate.toISOString().split('T')[0]

      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          treatment,
          patients ( first_name, last_name, email ),
          clinics ( name )
        `)
        .eq('doctor_id', profile.id)
        .eq('date', targetDateString)
        .eq('status', 'pendiente')

      if (aptError) {
        console.error(`Error fetching appointments for doctor ${profile.id}:`, aptError)
        continue;
      }

      // 3. Enviar los emails
      for (const apt of appointments) {
        if (!apt.patients?.email) continue; // Saltar si el paciente no tiene email

        const confirmUrl = `${APP_URL}/accion/turno?id=${apt.id}&action=confirm`
        const cancelUrl = `${APP_URL}/accion/turno?id=${apt.id}&action=cancel`

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #F9E04B; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #1a1a2e; font-size: 24px;">Confirmación de Turno</h1>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px;">Hola <strong>${apt.patients.first_name}</strong>,</p>
              <p style="font-size: 16px;">Te recordamos que tienes un turno programado en <strong>${apt.clinics?.name || 'la clínica'}</strong> para el siguiente tratamiento: <em>${apt.treatment}</em>.</p>
              
              <div style="background-color: #FFFDE7; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; border: 1px dashed #F9E04B;">
                <p style="margin: 0 0 10px 0; font-size: 18px;"><strong>📅 Fecha:</strong> ${apt.date}</p>
                <p style="margin: 0; font-size: 18px;"><strong>⏰ Hora:</strong> ${apt.time.slice(0, 5)}</p>
              </div>

              <p style="font-size: 16px; text-align: center;">Por favor, indícanos si vas a poder asistir:</p>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${confirmUrl}" style="background-color: #22c55e; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(34, 197, 94, 0.2);">✔️ Asistiré (Confirmar)</a>
                <a href="${cancelUrl}" style="background-color: #ef4444; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-left: 15px; font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.2);">❌ No asistiré (Cancelar)</a>
              </div>
            </div>

            <div style="background-color: #f5f5f5; padding: 15px; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                Si tienes alguna duda, por favor contáctate con la clínica.<br>
                Generado automáticamente por DentApp.
              </p>
            </div>
          </div>
        `;

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'DentApp <turnos@tudominio.com>', // REEMPLAZAR con el dominio real configurado en Resend
            to: apt.patients.email,
            subject: 'Recordatorio de Turno - Por favor confirma tu asistencia',
            html: htmlContent
          })
        })

        if (res.ok) {
          emailsSent++;
        } else {
          console.error(`Failed to send email to ${apt.patients.email}`, await res.text())
        }
      }
    }

    return new Response(JSON.stringify({ success: true, emailsSent }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
