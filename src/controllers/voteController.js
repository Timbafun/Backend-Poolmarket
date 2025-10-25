import pool from '../db.js';

// Função que o frontend usa para carregar os votos iniciais e o placar
export const getVotes = async (req, res) => {
    try {
        // Conta os votos pagos (status 'PAID') para cada candidato
        const voteCounts = await pool.query(`
            SELECT 
                candidate_voted, 
                COUNT(*) AS count 
            FROM 
                transactions 
            WHERE 
                status = 'PAID' 
            GROUP BY 
                candidate_voted;
        `);

        // Formata os resultados para o frontend (Ex: { lula: 10, bolsonaro: 5 })
        const votes = voteCounts.rows.reduce((acc, row) => {
            acc[row.candidate_voted.toLowerCase()] = parseInt(row.count, 10);
            return acc;
        }, {});

        res.status(200).json(votes);
    } catch (error) {
        console.error("Erro ao buscar contagem de votos:", error);
        res.status(500).json({ message: "Erro interno ao carregar votos." });
    }
};

// Função para listar os candidatos (se o seu frontend precisar)
export const getCandidates = async (req, res) => {
    // Lista fixa, pois os candidatos não mudam. Você pode buscar isso do DB se tiver uma tabela de candidatos.
    const candidates = [
        { id: 1, name: 'Lula', key: 'lula' },
        { id: 2, name: 'Bolsonaro', key: 'bolsonaro' }
    ];
    
    res.status(200).json(candidates);
};