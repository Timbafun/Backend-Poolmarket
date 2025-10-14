import express from "express";
// ✅ ADIÇÃO 1: Importa a função de votação
import { registerUser, loginUser, castVote } from "../controllers/userController.js";
// ✅ ADIÇÃO 2: Importa o middleware de segurança (protect)
import { protect } from "../middleware/authMiddleware.js"; 

const router = express.Router();

// rota de cadastro (mantida)
router.post("/register", registerUser);

// rota de login (mantida)
router.post("/login", loginUser);

// 🔑 ADIÇÃO CRÍTICA: Rota de votação. 
// O middleware 'protect' valida o token antes de chamar 'castVote'.
router.post("/vote", protect, castVote); 

export default router;