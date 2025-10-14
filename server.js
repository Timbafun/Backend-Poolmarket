import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// ✅ CORREÇÃO 1: Caminho ajustado. Assume que userRoutes está em src/routes
import userRoutes from "./src/routes/userRoutes.js"; 
// ✅ CORREÇÃO 2: Caminho ajustado. Assume que db.js está em src/
import pool from "./src/db.js"; 

dotenv.config();

const app = express();

// 🔑 CORREÇÃO CRÍTICA DO CORS: Permite todas as origens
const corsOptions = {
    // Usamos '*' ou uma função dinâmica para aceitar subdomínios temporários do Netlify
    origin: '*', // Permite que todas as URLs (incluindo as de deploy do Netlify) se comuniquem
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Importante para enviar cookies e headers de autorização
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions)); 

app.use(express.json());

// Verifica se o pool de banco de dados está inicializado (para depuração)
app.use((req, res, next) => {
    if (!pool) {
        console.error("Pool de DB não inicializado. Verifique db.js e imports.");
        // Não retorna erro 500 para evitar quebrar tudo, apenas loga.
    }
    next();
});

// Rotas: O prefixo /api é adicionado a todas as rotas em userRoutes
app.use("/api", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});