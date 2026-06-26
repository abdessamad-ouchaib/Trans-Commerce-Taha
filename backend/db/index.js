const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // required for Neon
});

pool.on('error', (err) => {
  console.error('Erreur PostgreSQL inattendue:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
