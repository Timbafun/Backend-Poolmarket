// server.js

import express from 'express';
import cors from 'cors';
import userRoutes from './src/routes/userRoutes.js'; 
import './src/db.js'; // Importa a conexão com o banco de dados

const app = express();

// A URL do seu Frontend no Netlify (corrigida do erro CORS)
const frontendUrl = 'https://68ee96618dacf8f0fde870ea--poolmarket1.netlify.app'; 

// Configuração do CORS
const corsOptions = {
    origin: frontendUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json()); // Middleware para interpretar JSON

// Rota de teste simples (opcional)
app.get('/', (req, res) => {
    res.send('PoolMarket Backend está funcionando!');
});

// Rotas da Aplicação
app.use('/api', userRoutes);

// O Render fornece a variável de ambiente PORT. Se não houver, usa 5000 como padrão.
const PORT = process.env.PORT || 5000; 

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});