import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("A string de conexão com o banco de dados está faltando."); 
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
});

pool.on("connect", () => {
    console.log("Conexão com PostgreSQL estabelecida com sucesso!");
});

pool.on("error", (err) => {
    console.error("Erro na conexão com PostgreSQL:", err);
});

export default pool;