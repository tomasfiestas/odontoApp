const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'd:/DentAPP/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log("Fetching clinics...");
    const { data, error } = await supabase.from('clinics').select('*').limit(1);
    console.log('Columns:', data && data.length ? Object.keys(data[0]) : 'No data');
    console.log('Row:', data && data.length ? data[0] : null);
    console.log('Error:', error);
}

checkSchema();
