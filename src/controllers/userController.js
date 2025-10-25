import pool from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

export const registerUser = async (req, res) => {
    const { name, email, cpf, telefone, senha } = req.body;

    try {
        const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'Usuário já registrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);

        // ATENÇÃO: A query usa as colunas conforme a imagem do seu DB
        const result = await pool.query(
            'INSERT INTO users (name, email, cpf, telefone, senha, has_voted, voted_for) VALUES ($1, $2, $3, $4, $5, FALSE, NULL) RETURNING id, name, email',
            [name, email, cpf, telefone, hashedPassword]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.status(201).json({
                id: user.id,
                name: user.name,
                email: user.email,
                token: generateToken(user.id),
            });
        } else {
            res.status(400).json({ message: 'Dados inválidos.' });
        }
    } catch (error) {
        console.error("ERRO NO CADASTRO:", error.message);
        res.status(500).json({ message: 'Erro interno do servidor no cadastro.' });
    }
};

export const loginUser = async (req, res) => {
    const { email, senha } = req.body;

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const user = userResult.rows[0];

        if (await bcrypt.compare(senha, user.senha)) {
            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                token: generateToken(user.id),
            });
        } else {
            res.status(401).json({ message: 'Credenciais inválidas.' });
        }
    } catch (error) {
        console.error("ERRO NO LOGIN:", error.message);
        res.status(500).json({ message: 'Erro interno do servidor no login.' });
    }
};

export const getUserProfile = async (req, res) => {
    if (req.user) {
        res.json({
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
        });
    } else {
        res.status(404).json({ message: 'Usuário não encontrado.' });
    }
};