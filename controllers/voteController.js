import pool from '../db.js';

export const getVotes = async (req, res) => {
  const { candidateId } = req.params;
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM votes WHERE candidate_id=$1',
      [candidateId]
    );
    res.json({ votes: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar votos' });
  }
};

export const voteCandidate = async (req, res) => {
  const { userId, candidateId } = req.body;
  try {
    const vote = await pool.query(
      'INSERT INTO votes (user_id, candidate_id) VALUES ($1,$2) RETURNING *',
      [userId, candidateId]
    );
    res.status(201).json({ message: 'Voto registrado', vote: vote.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao registrar voto' });
  }
};
