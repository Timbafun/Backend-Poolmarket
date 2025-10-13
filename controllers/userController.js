import pool from "../db.js"; // sua conexão PostgreSQL

// --- CADASTRO ---
export const registerUser = async (req, res) => {
  const { nome, email, telefone, cpf, senha } = req.body;

  try {
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ ok: false, message: "E-mail já cadastrado." });
    }

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

// --- LOGIN ---
export const loginUser = async (req, res) => {
  const { email, senha } = req.body;

  try {
    // busca usuário pelo e-mail
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ ok: false, message: "E-mail não encontrado." });
    }

    const user = result.rows[0];

    // compara a senha digitada com a salva no banco (texto puro, pois não usamos hash)
    if (user.senha !== senha) {
      return res.status(401).json({ ok: false, message: "Credenciais inválidas." });
    }

    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Erro no servidor." });
  }
};
