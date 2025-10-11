import express from 'express';
import { getVotes, voteCandidate } from '../controllers/voteController.js';
const router = express.Router();

router.get('/:candidateId', getVotes);
router.post('/', voteCandidate);

export default router;
