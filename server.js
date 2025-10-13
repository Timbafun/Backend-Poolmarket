import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Mantendo suas rotas de usuário existentes
app.use("/api", userRoutes);

// ✅ Adicionando o endpoint de cadastro no userRoutes.js
// Não é necessário alterar nada aqui, a rota já estará disponível via /api/register
// Basta garantir que no userRoutes.js exista o POST /register conforme instruções anteriores

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
