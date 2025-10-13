import express from "express";
import { registerUser, loginUser } from "../controllers/userController.js";

const router = express.Router();

// rota de cadastro (mantida)
router.post("/register", registerUser);

// rota de login (adicionada)
router.post("/login", loginUser);

export default router;
