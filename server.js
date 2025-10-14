// server.js (Localizado na raiz do Backend)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// ✅ Caminho final para userRoutes (dentro de src)
import userRoutes from "./src/routes/userRoutes.js";
// ✅ Caminho final para db.js (dentro de src)
import pool from "./src/db.js"; 

dotenv.config();

const app = express();

const corsOptions = {
    origin: 'https://poolmarket1.netlify.app',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions)); 
app.use(express.json());

// Verifica a conexão do DB ao iniciar (Opcional, mas útil)
app.use((req, res, next) => {
    if (!pool) {
        return res.status(500).send("Erro interno: Pool de DB não inicializado.");
    }
    next();
});

// Rotas
app.use("/api", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});