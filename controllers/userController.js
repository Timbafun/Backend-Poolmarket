import pool from "../db.js"; // sua conexão PostgreSQL
import bcrypt from "bcryptjs";

/**
 * registerUser - função existente (mantida exatamente como antes)
 */
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
    console.error("Erro no registerUser:", err);
    res.status(500).json({ ok: false, message: "Erro no servidor." });
  }
};

/**
 * loginUser - função robusta para aceitar diferentes formatos de request e comparar senha
 *
 * - tenta extrair email/CPF e senha de vários nomes de campo possíveis (compatibilidade).
 * - normaliza email (trim + lowercase) ao procurar no banco.
 * - tenta buscar por email (case-insensitive) e, se não encontrar e um CPF foi enviado, tenta por CPF.
 * - compara senha em texto puro e, caso a senha no banco seja um hash bcrypt, tenta bcrypt.compare.
 * - retorna { ok: true, user } em caso de sucesso, ou mensagens claras em caso de falha.
 */
export const loginUser = async (req, res) => {
  try {
    // Log para depuração (mostre no Render logs o que está chegando)
    console.log("Dados recebidos no /login:", req.body);

    // Aceita vários nomes de campo possíveis do front-end
    const rawEmail =
      req.body.email ||
      req.body.emailLogin ||
      req.body.userEmail ||
      req.body.username ||
      null;

    const rawCpf =
      req.body.cpf ||
      req.body.CPF ||
      req.body.cpfLogin ||
      null;

    const rawSenha =
      req.body.senha ||
      req.body.password ||
      req.body.senhaLogin ||
      req.body.pass ||
      null;

    if ((!rawEmail && !rawCpf) || !rawSenha) {
      return res.status(400).json({ ok: false, message: "Email/CPF e senha são obrigatórios." });
    }

    // normaliza valores
    const email = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
    const cpf = rawCpf ? String(rawCpf).replace(/\D/g, "").trim() : null;
    const senha = String(rawSenha);

    let result;
    // 1) se email fornecido, busca por email (case-insensitive)
    if (email) {
      result = await pool.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
    }

    // 2) se não encontrou por email e CPF está disponível, tenta por CPF (limpo)
    if ((!result || result.rows.length === 0) && cpf) {
      result = await pool.query("SELECT * FROM users WHERE regexp_replace(cpf, '\\\\D','','g') = $1", [cpf]);
    }

    // 3) se ainda não encontrou, devolve erro
    if (!result || result.rows.length === 0) {
      return res.status(401).json({ ok: false, message: "Credenciais inválidas." });
    }

    const user = result.rows[0];

    // Comparação de senha:
    // - Se a senha do banco for igual ao recebido -> ok (texto puro)
    // - Caso contrário, tenta bcrypt.compare caso a senha no banco seja um hash
    let senhaCorreta = false;

    try {
      if (user.senha === senha) {
        senhaCorreta = true;
      } else {
        // tenta bcrypt (se a senha armazenada for hash)
        senhaCorreta = await bcrypt.compare(senha, user.senha);
      }
    } catch (err) {
      // se bcrypt falhar por qualquer razão, considera inválida mas loga
      console.error("Erro ao comparar senha (bcrypt):", err);
      senhaCorreta = false;
    }

    if (!senhaCorreta) {
      return res.status(401).json({ ok: false, message: "Credenciais inválidas." });
    }

    // sucesso: retorna usuário (mantendo formato simples, sem token)
    // Opcional: remover campo senha antes de retornar
    const safeUser = { ...user };
    if (safeUser.senha) delete safeUser.senha;

    console.log("Login bem-sucedido para:", safeUser.email || safeUser.cpf);
    return res.json({ ok: true, user: safeUser });
  } catch (err) {
    console.error("Erro no loginUser:", err);
    return res.status(500).json({ ok: false, message: "Erro no servidor." });
  }
};
