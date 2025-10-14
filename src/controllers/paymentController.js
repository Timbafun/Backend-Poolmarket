// src/controllers/paymentController.js

import pool from '../db.js';
import axios from 'axios';

// URL de Produção da API PagSeguro para Pedidos (Orders)
const PAGSEGURO_API_URL = 'https://api.pagseguro.com'; 

// Headers para autenticação (Seu token do Render)
const PAGSEGURO_HEADERS = {
    'Authorization': `Bearer ${process.env.PAGSEGURO_TOKEN}`,
    'Content-Type': 'application/json',
};

// 1. Rota protegida: Gera o PIX e o QR Code
export const generatePixCharge = async (req, res) => {
    const { candidate, amount } = req.body; 
    const userId = req.user.id; // Vindo do middleware 'protect'
    const userEmail = req.user.email;
    const userCpf = req.user.cpf ? req.user.cpf.replace(/\D/g, "") : null; // Limpa o CPF

    // VALOR MÍNIMO DE VOTO
    const VOTE_AMOUNT = 1.00; 
    if (amount < VOTE_AMOUNT) {
        return res.status(400).json({ ok: false, message: `Valor mínimo é R$ ${VOTE_AMOUNT.toFixed(2)}.` });
    }

    // 1. Verificação de Voto e PIX Pendente
    try {
        const userCheck = await pool.query("SELECT has_voted FROM users WHERE id = $1", [userId]);
        if (userCheck.rows.length > 0 && userCheck.rows[0].has_voted) {
            return res.status(400).json({ ok: false, message: "Você já votou." });
        }
        
        const existingTransaction = await pool.query(
            "SELECT qr_code_base66, qr_code_pix FROM transactions WHERE user_id = $1 AND status = 'PENDING'",
            [userId]
        );

        if (existingTransaction.rows.length > 0) {
            return res.status(200).json({ 
                ok: true, 
                message: "Transação pendente já existe.",
                qrCodeUrl: existingTransaction.rows[0].qr_code_base66, // Corrigido para URL
                pixCode: existingTransaction.rows[0].qr_code_pix
            });
        }
    } catch (dbError) {
        console.error("Erro ao verificar transação:", dbError);
        return res.status(500).json({ ok: false, message: "Erro interno do servidor." });
    }

    // 2. Criação do Pedido (Order) na PagSeguro
    const valueInCents = Math.round(amount * 100);

    const orderData = {
        reference_id: `VOTO-${userId}-${Date.now()}`, 
        customer: {
            email: userEmail,
            // CPF é opcional, mas se existir, deve ser limpo e enviado
            tax_id: userCpf 
        },
        items: [{
            name: `Voto em ${candidate}`,
            quantity: 1,
            unit_amount: valueInCents,
        }],
        qr_codes: [{
            amount: { value: valueInCents },
            expiration_date: new Date(Date.now() + 15 * 60 * 1000).toISOString(), 
        }],
        notification_urls: [
            process.env.PAGSEGURO_WEBHOOK_URL // Pega a URL do Render
        ]
    };

    try {
        const response = await axios.post(`${PAGSEGURO_API_URL}/orders`, orderData, {
            headers: PAGSEGURO_HEADERS
        });

        const order = response.data;
        const qrCodeData = order.qr_codes[0];
        
        const pixBase64Url = qrCodeData.links.find(link => link.media === 'image/png').href;
        const pixCopiaEColaUrl = qrCodeData.links.find(link => link.media === 'text/plain').href;
        
        const pixPayloadResponse = await axios.get(pixCopiaEColaUrl);
        const pixCode = pixPayloadResponse.data;

        // 3. Salva a transação PENDENTE no DB
        await pool.query(
            `INSERT INTO transactions 
            (user_id, payment_id, qr_code_base66, qr_code_pix, candidate_voted, status) 
            VALUES ($1, $2, $3, $4, $5, 'PENDING')`,
            [userId, order.id, pixBase64Url, pixCode, candidate]
        );

        return res.status(201).json({ 
            ok: true, 
            message: "PIX gerado com sucesso! Aguardando pagamento.",
            qrCodeUrl: pixBase64Url, 
            pixCode: pixCode, 
            orderId: order.id
        });

    } catch (error) {
        console.error("Erro ao gerar PIX:", error.response ? error.response.data : error.message);
        return res.status(500).json({ ok: false, message: "Falha ao gerar o PIX. Verifique as credenciais no Render." });
    }
};

// 2. Rota NÃO protegida: Recebe a notificação do PagSeguro (Webhook)
export const handleWebhook = async (req, res) => {
    const notification = req.body;
    const orderId = notification.id || notification.order_id; 
    
    if (!orderId) {
        return res.status(400).send("ID de Ordem ausente no Webhook.");
    }
    
    try {
        const response = await axios.get(`${PAGSEGURO_API_URL}/orders/${orderId}`, {
            headers: PAGSEGURO_HEADERS
        });
        
        const orderStatus = response.data.charges[0] ? response.data.charges[0].status : null; 
        
        if (orderStatus === 'PAID') {
            const transactionUpdate = await pool.query(
                "UPDATE transactions SET status = 'PAID' WHERE payment_id = $1 AND status != 'PAID' RETURNING user_id, candidate_voted",
                [orderId]
            );

            if (transactionUpdate.rows.length === 0) {
                return res.status(200).send("Transação já paga ou não encontrada no DB.");
            }

            const { user_id, candidate_voted } = transactionUpdate.rows[0];

            // ATUALIZA A TABELA DE USUÁRIOS (FINALIZA O VOTO)
            await pool.query(
                `UPDATE users SET has_voted = TRUE, voted_for = $1, voted_at = NOW() WHERE id = $2`,
                [candidate_voted, user_id]
            );
            
            return res.status(200).send("Notificação recebida e voto finalizado com sucesso.");
            
        } else if (orderStatus === 'CANCELED' || orderStatus === 'EXPIRED') {
             await pool.query("UPDATE transactions SET status = $1 WHERE payment_id = $2", [orderStatus, orderId]);
             return res.status(200).send("Status da transação atualizado para não pago.");
        }
        
        return res.status(200).send("Status sem necessidade de ação.");

    } catch (error) {
        console.error("Erro no Webhook ao processar PagSeguro:", error.response ? error.response.data : error.message);
        return res.status(500).send("Erro interno ao processar webhook.");
    }
};