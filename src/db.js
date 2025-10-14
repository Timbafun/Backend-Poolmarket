// src/db.js

import pkg from 'pg';
const { Pool } = pkg;

// O Render fornece a connection string (DATABASE_URL) automaticamente.
// Removemos o 'dotenv' para evitar o erro de inicialização.

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Necessário para conexões seguras na nuvem
  },
});

pool.on("connect", () => {
  console.log("✅ Conexão com PostgreSQL estabelecida com sucesso!");
});

pool.on("error", (err) => {
  console.error("❌ Erro na conexão com PostgreSQL:", err);
});

export default pool;