import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();

// ✅ CORREÇÃO CORS: Configuração específica para permitir o acesso do seu frontend no Netlify
const corsOptions = {
    // ⚠️ DOMÍNIO OFICIAL DO SEU FRONTEND NO NETLIFY
    origin: 'https://poolmarket1.netlify.app',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Importante para headers de autorização
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions)); // Aplica a configuração CORS

app.use(express.json());

// Rotas
app.use("/api", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});