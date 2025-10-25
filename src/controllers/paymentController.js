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
    const userTaxId = userDetails.cpf ? userDetails.cpf.replace(/\D/g, "") : null;

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
        reference_id: `VOTO-${userId}-${Date.now()}`, 
        customer: {
            email: userEmail,
            name: userName, 
            tax_id: userTaxId,
            phones: [MOCK_PHONE] 
        },
        items: [{
            name: `Voto em ${candidate} (R$ ${VOTE_AMOUNT.toFixed(2)})`,
            quantity: 1,
            unit_amount: valueInCents,
        }],
        shipping: {
            address: MOCK_ADDRESS
        },
        qr_codes: [{
            amount: { value: valueInCents },
            expiration_date: new Date(Date.now() + 15 * 60 * 1000).toISOString(), 
        }],
        notification_urls: [
            process.env.PAGSEGURO_WEBHOOK_URL
        ]
    };

    try {
        const response = await axios.post(`${PAGSEGURO_API_BASE_URL}/orders`, orderData, {
            headers: PAGSEGURO_HEADERS
        });

        const order = response.data;
        const qrCodeData = order.qr_codes[0];
        
        const pixBase64Url = qrCodeData.links.find(link => link.media === 'image/png').href;
        const pixCode = qrCodeData.payload;

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
        console.error("Erro ao gerar PIX (PagSeguro):", error.response ? error.response.data : error.message);
        const pagseguroError = error.response && error.response.data && error.response.data.error_messages ? 
            error.response.data.error_messages.map(e => `${e.parameter_name}: ${e.description}`).join('; ') : 
            "Verifique as credenciais no Render.";
        
        return res.status(500).json({ ok: false, message: `Falha ao gerar o PIX. Detalhe: ${pagseguroError}` });
    }
};

export const handleWebhook = async (req, res) => {
    const notification = req.body;
    const orderId = notification.id || notification.order_id; 
    
    if (!orderId) {
        return res.status(400).send("ID de Ordem ausente no Webhook.");
    }
    
    try {
        const response = await axios.get(`${PAGSEGURO_API_BASE_URL}/orders/${orderId}`, {
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