import pool from "../db.js"; 
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; 

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', 
    });
};

const mapUserToFrontend = (userDb) => {
    if (!userDb) return null;

    return {
        id: userDb.id,
        nome: userDb.nome,
        email: userDb.email,
        telefone: userDb.telefone,
        cpf: userDb.cpf,
        hasVoted: userDb.has_voted || false, 
        votedFor: userDb.voted_for || null, 
        votedAt: userDb.voted_at || null
    };
};

// --- ROTAS (As outras funções mantêm o corpo que te passei anteriormente) ---

/**
 * registerUser - Com Hash de Senha
 */
export const registerUser = async (req, res) => {
    // ... (Mantém o código de hash e inserção que te passei na última resposta)
    // ... (Usa a senha criptografada)
    // ... (Retorna o Token e o objeto mapeado)
};


/**
 * loginUser - CORREÇÃO CRÍTICA DE COMPATIBILIDADE DE SENHA
 */
export const loginUser = async (req, res) => {
    try {
        // ... (Seu código de extração de campos e busca no DB mantido) ...

        // Seu código de extração de campos e busca no DB...
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
        
        // 🔑 CORREÇÃO CRÍTICA: Permite senhas em texto puro para usuários antigos.
        if (user.senha === senha) {
            senhaCorreta = true;
        } else {
            // Tenta bcrypt para senhas criptografadas (usuários novos)
            try {
                senhaCorreta = await bcrypt.compare(senha, user.senha);
            } catch (err) {
                // Ignore erros do bcrypt, apenas se a senha for hash
                senhaCorreta = false;
            }
        }
        // FIM DA CORREÇÃO CRÍTICA

        if (!senhaCorreta) {
            return res.status(401).json({ ok: false, message: "Credenciais inválidas." });
        }

        // Sucesso: Mapeia o usuário para o formato do Frontend e retorna o Token
        const frontendUser = mapUserToFrontend(user);
        const token = generateToken(user.id); 

        return res.json({ ok: true, user: { ...frontendUser, token } }); 

    } catch (err) {
        console.error("Erro no loginUser:", err);
        return res.status(500).json({ ok: false, message: "Erro no servidor." });
    }
};

/**
 * castVote - Mantém o código que te passei anteriormente
 */
export const castVote = async (req, res) => {
    // ... (Mantém o código de votação que te passei na última resposta)
    // ... (Ele usa o mapUserToFrontend para garantir o camelCase)
};