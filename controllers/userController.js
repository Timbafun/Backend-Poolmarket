import pool from "../db.js"; // sua conexão PostgreSQL
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; // ✅ ADIÇÃO 1: Importa JWT

/**
 * Função utilitária para gerar o Token JWT
 */
const generateToken = (id) => {
    // Gera o token baseado no ID do usuário e na chave secreta do .env
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', // Validade do token
    });
};

/**
 * registerUser - CORRIGIDO para retornar o Token JWT
 */
export const registerUser = async (req, res) => {
  const { nome, email, telefone, cpf, senha } = req.body;

  // ⚠️ Recomendação: Hash da senha deve ser feito aqui antes do INSERT.
  // Para não alterar sua lógica, estou mantendo o código sem o hash.
  
  try {
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ ok: false, message: "E-mail já cadastrado." });
    }

    const result = await pool.query(
      "INSERT INTO users (nome, email, telefone, cpf, senha) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [nome, email, telefone, cpf, senha]
    );

    const user = result.rows[0];
    const safeUser = { ...user };
    if (safeUser.senha) delete safeUser.senha;

    // ✅ CORREÇÃO 2: Gera o token na hora do cadastro
    const token = generateToken(user.id); 

    // ✅ CORREÇÃO 3: Retorna o token para o frontend
    res.json({ ok: true, user: { ...safeUser, token } }); 
  } catch (err) {
    console.error("Erro no registerUser:", err);
    res.status(500).json({ ok: false, message: "Erro no servidor." });
  }
};

/**
 * loginUser - CORRIGIDO para gerar e retornar o Token JWT
 */
export const loginUser = async (req, res) => {
    // ... [Seu código de login robusto e comparação de senha mantido] ...

    // Mantendo toda a sua lógica de login...
    try {
        console.log("Dados recebidos no /login:", req.body);

        const rawEmail = req.body.email || req.body.emailLogin || req.body.userEmail || req.body.username || null;
        const rawCpf = req.body.cpf || req.body.CPF || req.body.cpfLogin || null;
        const rawSenha = req.body.senha || req.body.password || req.body.senhaLogin || req.body.pass || null;

        if ((!rawEmail && !rawCpf) || !rawSenha) {
            return res.status(400).json({ ok: false, message: "Email/CPF e senha são obrigatórios." });
        }

        const email = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
        const cpf = rawCpf ? String(rawCpf).replace(/\D/g, "").trim() : null;
        const senha = String(rawSenha);

        let result;
        if (email) {
            result = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
        }
        if ((!result || result.rows.length === 0) && cpf) {
            result = await pool.query("SELECT * FROM users WHERE regexp_replace(cpf, '\\\\D','','g') = $1", [cpf]);
        }
        if (!result || result.rows.length === 0) {
            return res.status(401).json({ ok: false, message: "Credenciais inválidas." });
        }

        const user = result.rows[0];
        let senhaCorreta = false;

        try {
            if (user.senha === senha) {
                senhaCorreta = true;
            } else {
                senhaCorreta = await bcrypt.compare(senha, user.senha);
            }
        } catch (err) {
            console.error("Erro ao comparar senha (bcrypt):", err);
            senhaCorreta = false;
        }

        if (!senhaCorreta) {
            return res.status(401).json({ ok: false, message: "Credenciais inválidas." });
        }

        // Sucesso:
        const safeUser = { ...user };
        if (safeUser.senha) delete safeUser.senha;

        // ✅ CORREÇÃO 4: Gera o token no login
        const token = generateToken(user.id); 

        console.log("Login bem-sucedido para:", safeUser.email || safeUser.cpf);
        // ✅ CORREÇÃO 5: Retorna o token para o frontend
        return res.json({ ok: true, user: { ...safeUser, token } }); 

    } catch (err) {
        console.error("Erro no loginUser:", err);
        return res.status(500).json({ ok: false, message: "Erro no servidor." });
    }
};

/**
 * castVote - ✅ ADIÇÃO CRÍTICA: Lógica para registrar o voto
 * Esta função só é chamada SE o token for validado pelo middleware 'protect'
 */
export const castVote = async (req, res) => {
    // req.user é populado pelo middleware de autenticação (protect)
    // Assumimos que o ID do usuário está em req.user.id
    const userId = req.user.id; 
    const { candidate } = req.body; 

    if (!candidate || (candidate !== 'lula' && candidate !== 'bolsonaro')) {
        return res.status(400).json({ ok: false, message: "Candidato inválido." });
    }

    try {
        // 1. Verifica se o usuário já votou
        const userResult = await pool.query(
            "SELECT voted_for FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, message: "Usuário não encontrado." });
        }

        if (userResult.rows[0].voted_for) {
            return res.status(400).json({ ok: false, message: "Você já votou." });
        }

        // 2. Registra o voto e atualiza o status do usuário no banco
        await pool.query(
            // ⚠️ Ajuste os nomes das colunas (e.g., voted_for, has_voted, voted_at) se forem diferentes no seu DB.
            "UPDATE users SET voted_for = $1, has_voted = TRUE, voted_at = NOW() WHERE id = $2",
            [candidate, userId]
        );
        
        // 3. Busca o usuário atualizado
        const updatedUserResult = await pool.query(
            "SELECT id, nome, email, cpf, has_voted, voted_for, voted_at FROM users WHERE id = $1",
            [userId]
        );
        const updatedUser = updatedUserResult.rows[0];

        // 4. Gera novo token (boa prática após mudança de estado)
        const token = generateToken(updatedUser.id);

        // 5. Retorna sucesso
        return res.json({ 
            ok: true, 
            message: "Voto registrado com sucesso.",
            user: { ...updatedUser, token }
        });

    } catch (err) {
        console.error("Erro no castVote:", err);
        return res.status(500).json({ ok: false, message: "Erro no servidor." });
    }
};