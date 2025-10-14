// src/routes/userRoutes.js

import express from "express";
import { registerUser, loginUser, castVote } from "../controllers/userController.js";
import { generatePixCharge, handleWebhook } from "../controllers/paymentController.js"; 
import { protect } from "../middleware/authMiddleware.js"; 

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// ROTA ANTIGA DE VOTO (Pode ser removida, mas é mantida por precaução)
router.post("/vote", protect, castVote); 

// ✅ ROTA 1: Inicia o processo de voto e Gera o PIX (Protegida)
router.post("/generate-pix", protect, generatePixCharge); 

// ✅ ROTA 2: Recebe a notificação do PagSeguro (NÃO PROTEGIDA)
router.post("/webhook/pagseguro", handleWebhook); 

export default router;