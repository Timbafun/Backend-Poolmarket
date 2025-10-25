import pool from '../db.js';
import axios from 'axios';

const PAGSEGURO_API_BASE_URL = process.env.PAGSEGURO_API_URL || 'https://api.pagseguro.com'; 

const PAGSEGURO_HEADERS = {
    'Authorization': `Bearer ${process.env.PAGSEGURO_TOKEN.trim()}`,
    'Content-Type': 'application/json',
};

const MOCK_PHONE = { 
    country: "55", 
    area: "11", 
    number: "999999999", 
    type: "MOBILE" 
};

const MOCK_ADDRESS = {
    street: "Rua de Teste PagBank",
    number: "100",
    locality: "Bairro de Teste",
    city: "Sao Paulo",
    region_code: "SP",
    country: "BRA",
    postal_code: "01311000"
};

export const generatePixCharge = async (req, res) => {
    const VOTE_AMOUNT = 1.00;
    const { candidate } = req.body;
    const userId = req.user.id;
    
    const valueInCents = Math.round(VOTE_AMOUNT * 100);

    let userDetails;
    try {
        const userResult = await pool.query(
            "SELECT email, name, cpf, has_voted FROM users WHERE id = $1", 
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ ok: false, message: "Usuário não encontrado." });
        }
        
        userDetails = userResult.rows[0];

        if (userDetails.has_voted) {
            return res.status(400).json({ ok: false, message: "Você já votou." });
        }

    } catch (dbError) {
        console.error("Erro ao verificar/buscar usuário:", dbError);
        return res.status(500).json({ ok: false, message: "Erro interno do servidor." });
    }
    
    const userEmail = userDetails.email;
    const userName = userDetails.name || "Cliente Teste Poolmarket"; 
    const userTaxId = userDetails.cpf ? userDetails.cpf.replace(/\D/g, "") : null; // Limpa o CPF

    if (!userTaxId || userTaxId.length < 11) {
        return res.status(400).json({ ok: false, message: "CPF do usuário não encontrado ou inválido no cadastro." });
    }

    try {
        const existingTransaction = await pool.query(
            "SELECT qr_code_base66, qr_code_pix FROM transactions WHERE user_id = $1 AND status = 'PENDING'",
            [userId]
        );

        if (existingTransaction.rows.length > 0) {
            return res.status(200).json({ 
                ok: true, 
                message: "Transação pendente já existe.",
                qrCodeUrl: existingTransaction.rows[0].qr_code_base66,
                pixCode: existingTransaction.rows[0].qr_code_pix
            });
        }
    } catch (dbError) {
        console.error("Erro ao verificar transação pendente:", dbError);
    }


    const orderData = {
        reference_id: