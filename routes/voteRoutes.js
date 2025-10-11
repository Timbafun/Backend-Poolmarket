import express from "express";
import { registerVote, getVoteCount } from "../controllers/voteController.js";

const router = express.Router();

router.post("/", registerVote);
router.get("/", getVoteCount);

export default router;
