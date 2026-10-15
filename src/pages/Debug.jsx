import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Debug() {
    const [info, setInfo] = useState(null)
    useEffect(() => {
        supabase.from('clinics').select('*').limit(1).then(res => setInfo(res))
    }, [])
    return <pre>{JSON.stringify(info, null, 2)}</pre>
}
