import pool from "../db.js"; 
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; 

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', 
    });
};

// CRÍTICO: Mapeia snake_case do DB para camelCase do Frontend
const mapUserToFrontend = (userDb) => {
    if (!userDb) return null;

    return {
        id: userDb.id,
        nome: userDb.nome,
        email: userDb.email,
        telefone: userDb.telefone,
        cpf: userDb.cpf,
        hasVoted: userDb.has_voted || false, // CORREÇÃO: has_voted -> hasVoted
        votedFor: userDb.voted_for || null, 
        votedAt: userDb.voted_at || null
    };
};

/**
 * registerUser - Gera Token e Hasheia Senha (CORRETO)
 */
export const registerUser = async (req, res) => {
    const { nome, email, telefone, cpf, senha } = req.body;
    try {
        const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existing.rows.length > 0) { return res.status(400).json({ ok: false, message: "E-mail já cadastrado." }); }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);
        const result = await pool.query(
            "INSERT INTO users (nome, email, telefone, cpf, senha, has_voted) VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING *",
            [nome, email, telefone, cpf, hashedPassword] 
        );
        const user = result.rows[0];
        const frontendUser = mapUserToFrontend(user);
        const token = generateToken(user.id); 
        res.json({ ok: true, user: { ...frontendUser, token } }); 
    } catch (err) {
        console.error("Erro no registerUser:", err);
        res.status(500).json({ ok: false, message: "Erro no servidor." });
    }
};

/**
 * loginUser - Resolve compatibilidade de senha e retorna Token (CORRETO)
 */
export const loginUser = async (req, res) => {
    try {
        const rawEmail = req.body.email || req.body.emailLogin || req.body.userEmail || req.body.username || null;
        const rawCpf = req.body.cpf || req.body.CPF || req.body.cpfLogin || null;
        const rawSenha = req.body.senha || req.body.password || req.body.senhaLogin || req.body.pass || null;
        if ((!rawEmail && !rawCpf) || !rawSenha) { return res.status(400).json({ ok: false, message: "Email/CPF e senha são obrigatórios." }); }
        const email = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
        const cpf = rawCpf ? String(rawCpf).replace(/\D/g, "").trim() : null;
        const senha = String(rawSenha);
        let result;
        if (email) { result = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]); }
        if ((!result || result.rows.length === 0) && cpf) { result = await pool.query("SELECT * FROM users WHERE regexp_replace(cpf, '\\\\D','','g') = $1", [cpf]); }
        if (!result || result.rows.length === 0) { return res.status(401).json({ ok: false, message: "Credenciais inválidas." }); }

        const user = result.rows[0];
        let senhaCorreta = false;
        
        // CORREÇÃO CRÍTICA: Prioriza texto puro para usuários antigos, depois tenta bcrypt
        if (user.senha === senha) {
            senhaCorreta = true;
        } else {
            try {
                senhaCorreta = await bcrypt.compare(senha, user.senha);
            } catch (err) {
                senhaCorreta = false;
            }
        }
        if (!senhaCorreta) { return res.status(401).json({ ok: false, message: "Credenciais inválidas." }); }

        const frontendUser = mapUserToFrontend(user);
        const token = generateToken(user.id); 
        return res.json({ ok: true, user: { ...frontendUser, token } }); 
    } catch (err) {
        console.error("Erro no loginUser:", err);
        return res.status(500).json({ ok: false, message: "Erro no servidor." });
    }
};

/**
 * castVote - Rota protegida (CORRETO)
 */
export const castVote = async (req, res) => {
    const userId = req.user.id; 
    const { candidate } = req.body; 

    if (!candidate || (candidate !== 'lula' && candidate !== 'bolsonaro')) {
        return res.status(400).json({ ok: false, message: "Candidato inválido." });
    }

    try {
        const userResult = await pool.query(
            "SELECT voted_for FROM users WHERE id = $1",
            [userId]
        );

        if (userResult.rows.length === 0 || userResult.rows[0].voted_for) {
            return res.status(400).json({ ok: false, message: "Você já votou." });
        }

        await pool.query(
            "UPDATE users SET voted_for = $1, has_voted = TRUE, voted_at = NOW() WHERE id = $2",
            [candidate, userId]
        );
        
        const updatedUserResult = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [userId]
        );
        const updatedUser = updatedUserResult.rows[0];

        const frontendUser = mapUserToFrontend(updatedUser);
        const token = generateToken(updatedUser.id);

        return res.json({ 
            ok: true, 
            message: "Voto registrado com sucesso.",
            user: { ...frontendUser, token }
        });

    } catch (err) {
        console.error("Erro no castVote:", err);
        return res.status(500).json({ ok: false, message: "Erro no servidor." });
    }
};