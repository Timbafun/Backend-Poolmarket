const express = require('express');
const { castVote, getVotes } = require('../controllers/voteController');

const router = express.Router();

router.post('/vote', castVote);
router.get('/results', getVotes);

module.exports = router;
