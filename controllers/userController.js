import pool from "../db.js"; 
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; 

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', 
    });
};

// --- Mapeamento de Colunas (snake_case -> camelCase) ---
const mapUserToFrontend = (userDb) => {
    if (!userDb) return null;

    const safeUser = {
        id: userDb.id,
        nome: userDb.nome,
        email: userDb.email,
        telefone: userDb.telefone,
        cpf: userDb.cpf,
        // ✅ CRÍTICO: Mapeamento de has_voted para hasVoted
        hasVoted: userDb.has_voted || false, 
        votedFor: userDb.voted_for || null, 
        votedAt: userDb.voted_at || null
        // Outros campos importantes que o front precisa (se houver)
    };
    return safeUser;
};

/**
 * registerUser - CORRIGIDO (Hash de Senha e Retorno de Dados Mapeados)
 */
export const registerUser = async (req, res) => {
    const { nome, email, telefone, cpf, senha } = req.body;

    try {
        const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ ok: false, message: "E-mail já cadastrado." });
        }

        // ⚠️ CORREÇÃO DE SEGURANÇA: Criptografa a senha antes de salvar
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);

        const result = await pool.query(
            "INSERT INTO users (nome, email, telefone, cpf, senha, has_voted) VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING *",
            [nome, email, telefone, cpf, hashedPassword] // Usa a senha criptografada
        );

        const user = result.rows[0];
        
        // Mapeia o usuário do DB para o formato que o Front espera
        const frontendUser = mapUserToFrontend(user);
        
        const token = generateToken(user.id); 

        // Retorna o objeto mapeado com o token
        res.json({ ok: true, user: { ...frontendUser, token } }); 
    } catch (err) {
        console.error("Erro no registerUser:", err);
        res.status(500).json({ ok: false, message: "Erro no servidor." });
    }
};

/**
 * loginUser - CORRIGIDO (Comparação com Hash e Retorno de Dados Mapeados)
 */
export const loginUser = async (req, res) => {
    try {
        // ... (Seu código de extração de campos mantido) ...
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

        // ✅ CORREÇÃO DE SEGURANÇA: Apenas bcrypt.compare (remove a comparação de texto puro)
        // Isso assume que todas as senhas já foram hash ou serão após o próximo login.
        senhaCorreta = await bcrypt.compare(senha, user.senha);
        
        if (!senhaCorreta) {
            return res.status(401).json({ ok: false, message: "Credenciais inválidas." });
        }

        // Sucesso: Mapeia o usuário para o formato do Frontend
        const frontendUser = mapUserToFrontend(user);
        const token = generateToken(user.id); 

        return res.json({ ok: true, user: { ...frontendUser, token } }); 

    } catch (err) {
        console.error("Erro no loginUser:", err);
        return res.status(500).json({ ok: false, message: "Erro no servidor." });
    }
};


/**
 * castVote - CORRIGIDO (Retorno de Dados Mapeados)
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

        // Registra o voto
        await pool.query(
            "UPDATE users SET voted_for = $1, has_voted = TRUE, voted_at = NOW() WHERE id = $2",
            [candidate, userId]
        );
        
        // Busca o usuário atualizado (todos os campos necessários)
        const updatedUserResult = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [userId]
        );
        const updatedUser = updatedUserResult.rows[0];

        // Mapeia o usuário do DB para o formato que o Front espera
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