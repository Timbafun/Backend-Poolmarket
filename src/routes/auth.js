import express from "express";
import pool from "../db.js"; // sua conexão PostgreSQL
const router = express.Router();

// POST /register
router.post("/register", async (req, res) => {
  const { nome, email, telefone, cpf, senha } = req.body;

  try {
    // verifica se email já existe
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ ok: false, message: "E-mail já cadastrado." });
    }

    // insere usuário no banco
    const result = await pool.query(
      "INSERT INTO users (nome, email, telefone, cpf, senha) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [nome, email, telefone, cpf, senha]
    );

    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Erro no servidor." });
  }
});

export default router;
