import { pool } from "../db.js";

// Registrar voto
export const registerVote = async (req, res) => {
  const { user_id, candidate_id } = req.body;

  try {
    const alreadyVoted = await pool.query(
      "SELECT * FROM votes WHERE user_id = $1",
      [user_id]
    );

    if (alreadyVoted.rows.length > 0)
      return res.status(400).json({ error: "Usuário já votou." });

    await pool.query("INSERT INTO votes (user_id, candidate_id) VALUES ($1, $2)", [
      user_id,
      candidate_id,
    ]);

    await pool.query("UPDATE candidates SET votes = votes + 1 WHERE id = $1", [candidate_id]);

    res.json({ message: "Voto registrado com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao registrar voto." });
  }
};

// Contagem de votos
export const getVoteCount = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM candidates ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar votos." });
  }
};
