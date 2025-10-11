import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

// Cadastro
export const registerUser = async (req, res) => {
  const { nome, email, telefone, cpf, senha, confirmSenha } = req.body;

  if (senha !== confirmSenha)
    return res.status(400).json({ error: "As senhas não conferem." });

  try {
    const cpfExistente = await pool.query("SELECT * FROM users WHERE cpf = $1", [cpf]);
    if (cpfExistente.rows.length > 0)
      return res.status(400).json({ error: "CPF já cadastrado." });

    const hashedPassword = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      "INSERT INTO users (nome, email, telefone, cpf, senha) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, cpf",
      [nome, email, telefone, cpf, hashedPassword]
    );

    res.json({ message: "Usuário cadastrado com sucesso!", user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao cadastrar usuário." });
  }
};

// Login
export const loginUser = async (req, res) => {
  const { cpf, senha } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE cpf = $1", [cpf]);
    const user = result.rows[0];

    if (!user) return res.status(400).json({ error: "CPF não encontrado." });

    const valid = await bcrypt.compare(senha, user.senha);
    if (!valid) return res.status(400).json({ error: "Senha incorreta." });

    const token = jwt.sign({ id: user.id, cpf: user.cpf }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login bem-sucedido!",
      token,
      user: { id: user.id, nome: user.nome, cpf: user.cpf }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao fazer login." });
  }
};
