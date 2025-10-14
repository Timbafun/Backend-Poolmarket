// server.js (Apenas o trecho de configuração do CORS)

import express from 'express';
import cors from 'cors'; // Deve ser um dos seus primeiros imports

// ... outros imports

const app = express();
// ...

// --- INÍCIO DA CORREÇÃO CRÍTICA DO CORS ---
// Usamos a URL exata do seu Frontend no Netlify para o CORS
const frontendUrl = 'https://68ee96618dacf8f0fde870ea--poolmarket1.netlify.app'; 

const corsOptions = {
    origin: frontendUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
// --- FIM DA CORREÇÃO CRÍTICA DO CORS ---

// ... restante do seu código (app.use(express.json());, app.use('/api', userRoutes);, etc.)