import pool from "../db.js"; // sua conexão PostgreSQL
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// ===============================
// FUNÇÃO DE CADASTRO (mantida igual)
// ===============================
export const registerUser = async (req, res) => {
  const { nome, email, telefone, cpf, senha } = req.body;

  try {
    // verifica se o e-mail já existe
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ ok: false, message: "E-mail já cadastrado." });
    }

    // insere o usuário no banco (mantendo a base original)
    const result = await pool.query(
      "INSERT INTO users (nome, email, telefone, cpf, senha) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [nome, email, telefone, cpf, senha]
    );

    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Erro no servidor." });
  }
};

// ===============================
// NOVA FUNÇÃO DE LOGIN (ADICIONADA)
// ===============================
export const loginUser = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, message: "Usuário não encontrado." });
    }

    const user = result.rows[0];

    // compatibilidade: tenta login com senha simples ou hash
    const senhaCorreta =
      user.senha === senha || (await bcrypt.compare(senha, user.senha));

    if (!senhaCorreta) {
      return res.status(401).json({ ok: false, message: "Senha incorreta." });
    }

    // cria token JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ ok: true, token, user });
  } catch (err) {
    console.error("Erro ao fazer login:", err);
    res.status(500).json({ ok: false, message: "Erro no servidor." });
  }
};
