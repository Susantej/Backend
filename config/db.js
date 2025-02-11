// const postgres = require('postgres')

// const connectionString = process.env.DATABASE_URL
// const sql = postgres(connectionString)

// module.exports = { sql }

// const { createClient } = require('@supabase/supabase-js');
// require('dotenv').config();

// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// module.exports = supabase;


// const createClient = require('@supabase/supabase-js').createClient;
// require('dotenv').config();

// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// // Add duplex option to the fetch options
// const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   global: {
//     fetch: (url, options) => {
//       return fetch(url, { ...options, duplex: 'half' });
//     }
//   },
//   // Handle row-level security policy error
//   hooks: {
//     async error({ error }) {
//       if (error.status === 403 && error.message === '{     "error": "new row violates row-level security policy" }') {
//         throw { statusCode: 403, error: 'Unauthorized', message: 'new row violates row-level security policy' };
//       }
//       throw error;
//     }
//   }
// });

// module.exports = { supabase };


