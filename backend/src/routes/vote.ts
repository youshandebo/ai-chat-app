import express from 'express';
import fs from 'fs';
import path from 'path';
import { writeJsonAtomic } from '../utils/fileUtils';

const router = express.Router();

const votesPath = path.resolve(process.cwd(), 'data/votes.json');

interface Vote {
    messageId: string;
    vote: 'up' | 'down' | null;
    timestamp: number;
}

interface VotesData {
    votes: Vote[];
}

// Ensure votes file exists
function ensureVotesFile() {
    const dir = path.dirname(votesPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(votesPath)) {
        fs.writeFileSync(votesPath, JSON.stringify({ votes: [] }, null, 2));
    }
}

// Store vote
router.post('/vote', (req, res) => {
    try {
        const { messageId, vote, timestamp } = req.body;

        if (!messageId) {
            return res.status(400).json({ error: 'messageId required' });
        }

        ensureVotesFile();

        const data: VotesData = JSON.parse(fs.readFileSync(votesPath, 'utf-8'));

        // Find existing vote for this message and update, or add new
        const existingIndex = data.votes.findIndex(v => v.messageId === messageId);

        if (vote === null) {
            // Remove vote
            if (existingIndex !== -1) {
                data.votes.splice(existingIndex, 1);
            }
        } else {
            const newVote: Vote = { messageId, vote, timestamp: timestamp || Date.now() };
            if (existingIndex !== -1) {
                data.votes[existingIndex] = newVote;
            } else {
                data.votes.push(newVote);
            }
        }

        writeJsonAtomic(votesPath, data);

        console.log(`[Vote] ${messageId}: ${vote}`);
        res.json({ success: true });
    } catch (e: any) {
        console.error('[Vote Error]', e);
        res.status(500).json({ error: e.message });
    }
});

// Get vote stats (for admin)
router.get('/votes/stats', (req, res) => {
    try {
        ensureVotesFile();
        const data: VotesData = JSON.parse(fs.readFileSync(votesPath, 'utf-8'));

        const upCount = data.votes.filter(v => v.vote === 'up').length;
        const downCount = data.votes.filter(v => v.vote === 'down').length;

        res.json({
            total: data.votes.length,
            up: upCount,
            down: downCount,
            ratio: upCount / (upCount + downCount || 1)
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
