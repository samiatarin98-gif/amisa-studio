const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing.');
}

const config = `window.AMISA_CONFIG = ${JSON.stringify({
  supabaseUrl,
  supabaseAnonKey
}, null, 2)};`;

fs.writeFileSync('config.js', config);

console.log('Amisa Studio config.js generated successfully.');
