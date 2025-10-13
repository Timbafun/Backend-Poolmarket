import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();

// **AJUSTE AQUI:** Configuração CORS específica para o seu frontend
const corsOptions = {
    // Permite explicitamente requisições de PoolMarket no Netlify
    origin: 'https://poolmarket1.netlify.app',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Necessário se você estiver usando cookies ou headers de autorização
    optionsSuccessStatus: 204 // Para o "preflight request" (OPTIONS)
};
app.use(cors(corsOptions));

app.use(express.json());

// Rotas
app.use("/api", userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});