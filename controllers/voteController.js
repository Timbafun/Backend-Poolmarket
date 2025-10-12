const { votes, users } = require('../db');

exports.castVote = (req, res) => {
  const { candidate, cpf } = req.body;

  // Verifica se o usuário existe
  const user = users.find(u => u.cpf === cpf);
  if (!user) {
    return res.status(400).json({ message: 'Usuário não encontrado' });
  }

  // Verifica se o usuário já votou
  if (user.hasVoted) {
    return res.status(400).json({ message: 'Usuário já votou' });
  }

  // Registra o voto
  if (candidate === 'lula' || candidate === 'bolsonaro') {
    votes[candidate] += 1;
    user.hasVoted = true;
    res.status(200).json({ message: 'Voto registrado com sucesso' });
  } else {
    res.status(400).json({ message: 'Candidato inválido' });
  }
};

exports.getVotes = (req, res) => {
  res.json(votes);
};
