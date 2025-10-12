const { users } = require('../db');

exports.registerUser = (req, res) => {
  const { nome, email, telefone, cpf } = req.body;

  // Verifica se o usuário já existe pelo CPF
  const existingUser = users.find(user => user.cpf === cpf);
  if (existingUser) {
    return res.status(400).json({ message: 'Usuário já cadastrado' });
  }

  // Adiciona o usuário
  const newUser = { nome, email, telefone, cpf, hasVoted: false };
  users.push(newUser);

  res.status(201).json({ message: 'Usuário cadastrado com sucesso', user: newUser });
};
