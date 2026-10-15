import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('d:/DentAPP/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    // Try to insert and see the error, or select 1 row to see columns
    const { data, error } = await supabase.from('clinics').select('*').limit(1);
    console.log('Columns in clinics:', data ? Object.keys(data[0] || {}) : 'No data');
    console.log('Error:', error);
}

checkSchema();
