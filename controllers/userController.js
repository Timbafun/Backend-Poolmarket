import pool from '../db.js';

export const registerUser = async (req, res) => {
  const { nome, email, telefone, cpf } = req.body;

  try {
    const existing = await pool.query(
      'SELECT * FROM users WHERE cpf = $1 OR email = $2',
      [cpf, email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Usuário já cadastrado' });
    }

    const newUser = await pool.query(
      'INSERT INTO users (nome, email, telefone, cpf) VALUES ($1,$2,$3,$4) RETURNING *',
      [nome, email, telefone, cpf]
    );

    res.status(201).json({ message: 'Usuário cadastrado com sucesso', user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao cadastrar usuário' });
  }
};
