// src/middleware/authMiddleware.js (Crie este arquivo no seu projeto do Backend)

import jwt from 'jsonwebtoken';
import pool from '../db.js'; // Ajuste o caminho conforme necessário

export const protect = async (req, res, next) => {
    let token;

    // 1. Verifica se o token está no cabeçalho
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Extrai o token "Bearer [token]"
            token = req.headers.authorization.split(' ')[1];

            // 2. Verifica a validade do token usando a chave secreta do .env
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Busca o usuário no banco usando o ID do token
            const userResult = await pool.query(
                'SELECT id, nome, email, cpf, has_voted, voted_for FROM users WHERE id = $1',
                [decoded.id]
            );

            if (userResult.rows.length === 0) {
                return res.status(401).json({ ok: false, message: 'Não autorizado, usuário do token não existe.' });
            }

            // 4. Anexa os dados do usuário à requisição (req.user)
            req.user = userResult.rows[0];
            
            // 5. Continua para a função castVote
            next();

        } catch (error) {
            console.error('Erro de Autenticação JWT:', error);
            // Se o token expirou ou é inválido
            return res.status(401).json({ ok: false, message: 'Sessão expirada. Faça login novamente.' });
        }
    }

    if (!token) {
        return res.status(401).json({ ok: false, message: 'Não autorizado, token ausente.' });
    }
};