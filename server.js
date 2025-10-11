import express from "express";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { Pool } = pkg;

const app = express();
app.use(express.json());
app.use(cors());

// 🔐 Configuração da conexão com o banco do Render
const pool = new Pool({
  connectionString:
    "postgres://poomarketdata:n8LrRTTdB7m9xiG6cNwpyIE7vJQ2cME6@dpg-d3l80rk9c44c7395ri90-a.render.com/poolmarket_m66l",
  ssl: { rejectUnauthorized: false },
});

// ⚙️ Função automática para criar as tabelas (roda toda vez que o servidor inicia)
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100),
        email VARCHAR(100) UNIQUE NOT NULL,
        telefone VARCHAR(20),
        cpf VARCHAR(14) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS candidatos (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        votos INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS votos (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        candidato_id INT REFERENCES candidatos(id),
        UNIQUE (user_id, candidato_id)
      );

      INSERT INTO candidatos (nome) VALUES 
      ('Jair Messias Bolsonaro'), 
      ('Luiz Inácio Lula da Silva')
      ON CONFLICT DO NOTHING;
    `);

    console.log("✅ Banco de dados inicializado com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao inicializar o banco:", err);
  }
};

// 🧾 Rota inicial só pra teste
app.get("/", (req, res) => {
  res.send("API do PoolMarket rodando! 🚀");
});

// 🧍 Cadastro de usuário
app.post("/api/register", async (req, res) => {
  try {
    const { nome, email, telefone, cpf, senha } = req.body;
    const hashedPassword = await bcrypt.hash(senha, 10);

    const existingUser = await pool.query("SELECT * FROM users WHERE cpf = $1", [cpf]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "CPF já cadastrado" });
    }

    await pool.query(
      "INSERT INTO users (nome, email, telefone, cpf, senha) VALUES ($1, $2, $3, $4, $5)",
      [nome, email, telefone, cpf, hashedPassword]
    );

    res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao cadastrar usuário" });
  }
});

// 🔑 Login
app.post("/api/login", async (req, res) => {
  try {
    const { cpf, senha } = req.body;
    const result = await pool.query("SELECT * FROM users WHERE cpf = $1", [cpf]);

    if (result.rows.length === 0)
      return res.status(400).json({ error: "Usuário não encontrado" });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(senha, user.senha);

    if (!validPassword) return res.status(401).json({ error: "Senha incorreta" });

    const token = jwt.sign({ id: user.id }, "seuSegredoJWT", { expiresIn: "1d" });
    res.json({ message: "Login realizado com sucesso", token });
  } catch (error) {
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

// 🗳️ Votação
app.post("/api/votar", async (req, res) => {
  try {
    const { user_id, candidato_id } = req.body;

    const jaVotou = await pool.query(
      "SELECT * FROM votos WHERE user_id = $1 AND candidato_id = $2",
      [user_id, candidato_id]
    );

    if (jaVotou.rows.length > 0) {
      return res.status(400).json({ error: "Usuário já votou nesse candidato" });
    }

    await pool.query("INSERT INTO votos (user_id, candidato_id) VALUES ($1, $2)", [
      user_id,
      candidato_id,
    ]);

    await pool.query("UPDATE candidatos SET votos = votos + 1 WHERE id = $1", [
      candidato_id,
    ]);

    res.json({ message: "Voto computado com sucesso!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao votar" });
  }
});

// 📊 Buscar contagem de votos
app.get("/api/votos", async (req, res) => {
  try {
    const resultado = await pool.query("SELECT * FROM candidatos ORDER BY id ASC");
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar votos" });
  }
});

// 🚀 Inicializa servidor + banco
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  await initDB(); // 🔥 Cria as tabelas automaticamente ao iniciar
});
