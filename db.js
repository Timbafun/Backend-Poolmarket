import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Usa diretamente a connection string do Render (DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // necessário para conexões seguras na nuvem
  },
});

pool.on("connect", () => {
  console.log("✅ Conexão com PostgreSQL estabelecida com sucesso!");
});

pool.on("error", (err) => {
  console.error("❌ Erro na conexão com PostgreSQL:", err);
});

export default pool;
