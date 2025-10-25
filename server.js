import express from 'express';
import cors from 'cors';
import userRoutes from './src/routes/userRoutes.js'; 
import './src/db.js';
import { generatePixCharge, handleWebhook } from './src/controllers/paymentController.js'; 
// Importação correta do authMiddleware (que exporta 'protect')
import { protect as authMiddleware } from './src/middleware/authMiddleware.js'; 
// Importação correta do voteController (que exporta 'getVotes' e 'getCandidates')
import { getVotes, getCandidates } from './src/controllers/voteController.js'; 

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

// Rotas de Usuário (login, cadastro, etc.)
app.use('/api', userRoutes);

// Rotas de Votos e Placar
// Usando as funções importadas diretamente
app.get('/api/votes', getVotes); 
app.get('/api/candidates', getCandidates); 

// Rotas de Pagamento PIX
app.post('/api/generate-pix', authMiddleware, generatePixCharge);

// Rota de Webhook do PagSeguro (Não precisa de authMiddleware)
app.post('/api/webhook/pagseguro', handleWebhook);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});