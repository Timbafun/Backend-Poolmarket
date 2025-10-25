// server.js

import express from 'express';
import cors from 'cors';
import userRoutes from './src/routes/userRoutes.js'; 
import './src/db.js'; // Importa a conexão com o banco de dados

const app = express();

// Lista de origens permitidas (seu domínio principal e o subdomínio do Netlify)
const allowedOrigins = [
    'https://poolmarket.fun',
    'https://poolmarket.netlify.app'
]; 

// Configuração do CORS
const corsOptions = {
    // Permite qualquer origem que esteja na lista allowedOrigins
    origin: (origin, callback) => {
        // Permite requisições sem 'origin' (como ferramentas de teste)
        if (!origin) return callback(null, true); 
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // Se a origem não for permitida, retorna o erro
            callback(new Error('Not allowed by CORS')); 
        }
    },
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