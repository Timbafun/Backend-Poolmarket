import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import voteRoutes from './routes/voteRoutes.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use('/users', userRoutes);
app.use('/votes', voteRoutes);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
