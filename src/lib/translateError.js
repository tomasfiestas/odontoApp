const errorMap = {
    'Invalid login credentials': 'Email o contraseña incorrectos',
    'Email not confirmed': 'Confirmá tu email antes de ingresar',
    'User already registered': 'Ya existe una cuenta con ese email',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Unable to validate email address: invalid format': 'El formato del email no es válido',
    'Email rate limit exceeded': 'Demasiados intentos. Esperá unos minutos.',
    'For security purposes, you can only request this once every 60 seconds': 'Por seguridad, solo podés solicitar esto una vez por minuto',
    'New password should be different from the old password': 'La nueva contraseña debe ser diferente a la anterior',
    'Auth session missing!': 'Tu sesión expiró. Iniciá sesión nuevamente.',
}

export function translateError(error) {
    if (!error) return 'Ocurrió un error inesperado'
    const message = typeof error === 'string' ? error : error.message || ''

    // Check exact match
    if (errorMap[message]) return errorMap[message]

    // Check partial match
    for (const [key, value] of Object.entries(errorMap)) {
        if (message.toLowerCase().includes(key.toLowerCase())) return value
    }

    return message || 'Ocurrió un error inesperado'
}
