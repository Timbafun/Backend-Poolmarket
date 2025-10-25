import express from 'express';
import cors from 'cors';
import userRoutes from './src/routes/userRoutes.js'; 
import pool from './src/db.js'; 
import { generatePixCharge, handleWebhook } from './src/controllers/paymentController.js'; 
import { protect as authMiddleware } from './src/middleware/authMiddleware.js'; 
import voteController from './src/controllers/voteController.js'; 

const app = express();

const allowedOrigins = [
    'https://poolmarket.fun',
    'https://poolmarket.netlify.app',
    'http://localhost:3000'
]; 

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); 
        
        if (origin.endsWith('netlify.app')) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS')); 
        }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('PoolMarket Backend está funcionando!');
});

// Rotas de Votos e Placar (Primeiro)
app.get('/api/votes', voteController.getVotes); 
app.get('/api/candidates', voteController.getCandidates); 

// Rotas de Pagamento PIX (Primeiro)
app.post('/api/generate-pix', authMiddleware, generatePixCharge);

// Rota de Webhook do PagSeguro (Primeiro)
app.post('/api/webhook/pagseguro', handleWebhook);

// Rotas de Usuário (login, cadastro, etc. - Último)
app.use('/api', userRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});