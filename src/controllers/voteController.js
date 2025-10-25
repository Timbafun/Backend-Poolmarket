import pool from '../db.js';

const getVotes = async (req, res) => {
    try {
        const voteCounts = await pool.query(`
            SELECT 
                "candidate_voted", 
                COUNT(*) AS count 
            FROM 
                "transactions" 
            WHERE 
                "status" = 'PAID' 
            GROUP BY 
                "candidate_voted";
        `);

        const votes = voteCounts.rows.reduce((acc, row) => {
            acc[row.candidate_voted.toLowerCase()] = parseInt(row.count, 10);
            return acc;
        }, { lula: 0, bolsonaro: 0 });

        res.status(200).json(votes);
    } catch (error) {
        console.error("ERRO na QUERY SQL de VOTOS:", error.message);
        res.status(500).json({ message: "Erro interno do servidor ao carregar votos." });
    }
};

const getCandidates = (req, res) => {
    const candidates = [
        { id: 1, name: 'Lula', key: 'lula' },
        { id: 2, name: 'Bolsonaro', key: 'bolsonaro' }
    ];
    
    res.status(200).json(candidates);
};

export default {
    getVotes,
    getCandidates
};