import pool from "../db.js";

export const registerUser = async (req, res) => {
  const { nome, email, telefone, cpf, senha } = req.body;

  try {
    // Verifica se já existe usuário com mesmo CPF ou e-mail
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE cpf = $1 OR email = $2",
      [cpf, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Usuário já cadastrado." });
    }

    // Insere novo usuário
    await pool.query(
      "INSERT INTO users (nome, email, telefone, cpf, senha) VALUES ($1, $2, $3, $4, $5)",
      [nome, email, telefone, cpf, senha]
    );

    res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    res.status(500).json({ error: "Erro no servidor." });
  }
};
