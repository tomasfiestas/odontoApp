const RESEND_API_KEY = process.env.RESEND_API_KEY || "TU_RESEND_API_KEY";
const APP_URL = "https://dent-6ou67ql1p-dentappcontacto-3796s-projects.vercel.app";

// Reemplaza esto con el correo con el que te registraste en Resend
const TU_CORREO = "dentappcontacto@gmail.com";

const htmlContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
    <div style="background-color: #F9E04B; padding: 20px; text-align: center;">
      <h1 style="margin: 0; color: #1a1a2e; font-size: 24px;">Confirmación de Turno</h1>
    </div>
    
    <div style="padding: 30px;">
      <p style="font-size: 16px;">Hola <strong>Tomás (Paciente de Prueba)</strong>,</p>
      <p style="font-size: 16px;">Te recordamos que tienes un turno programado en <strong>Clínica DentApp</strong> para el siguiente tratamiento: <em>Limpieza General</em>.</p>
      
      <div style="background-color: #FFFDE7; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; border: 1px dashed #F9E04B;">
        <p style="margin: 0 0 10px 0; font-size: 18px;"><strong>📅 Fecha:</strong> 2026-03-26</p>
        <p style="margin: 0; font-size: 18px;"><strong>⏰ Hora:</strong> 10:30</p>
      </div>

      <p style="font-size: 16px; text-align: center;">Por favor, indícanos si vas a poder asistir:</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${APP_URL}/accion/turno?id=test&action=confirm" style="background-color: #22c55e; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(34, 197, 94, 0.2);">✔️ Asistiré (Confirmar)</a>
        <a href="${APP_URL}/accion/turno?id=test&action=cancel" style="background-color: #ef4444; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-left: 15px; font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.2);">❌ No asistiré (Cancelar)</a>
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

fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'onboarding@resend.dev', // Resend permite usar este remitente para pruebas
    to: TU_CORREO,
    subject: 'PRUEBA - Recordatorio de Turno DentApp',
    html: htmlContent
  })
}).then(res => res.json()).then(data => {
  console.log("¡Correo enviado!", data);
}).catch(console.error);
