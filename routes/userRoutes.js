import express from "express";
// ⚠️ Adicione o castVote ao controller:
import { registerUser, loginUser, castVote } from "../controllers/userController.js";
// ⚠️ Adicione o middleware de autenticação:
import { protect } from "../middleware/authMiddleware.js"; 

const router = express.Router();

// rota de cadastro (mantida)
router.post("/register", registerUser);

// rota de login (mantida)
router.post("/login", loginUser);

// ✅ ADIÇÃO CRÍTICA: Rota de votação. 
// O middleware 'protect' verifica o token JWT enviado pelo frontend.
router.post("/vote", protect, castVote); 

export default router;