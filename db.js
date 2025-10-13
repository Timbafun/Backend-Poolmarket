import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,                  // host do seu PostgreSQL
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432, // converte para number
  database: process.env.DB_NAME,              // nome do database
  user: process.env.DB_USER,                  // usuário do database
  password: process.env.DB_PASSWORD,          // senha
  ssl: { rejectUnauthorized: false },         // necessário para Render e outros serviços na nuvem
});

pool.on("connect", () => {
  console.log("Conexão com PostgreSQL estabelecida!");
});

pool.on("error", (err) => {
  console.error("Erro na conexão com PostgreSQL:", err);
});

export default pool;
