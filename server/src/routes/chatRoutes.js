import { Router } from 'express';
import { asyncHandler, fail } from '../utils/core.js';
import { requireAuth, requireVerifiedEmail } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { chatSchema } from '../validators/index.js';
import { answerQuestion, persistConversation, listConversations, getConversation } from '../services/chatService.js';

const router = Router();
router.use(requireAuth, requireVerifiedEmail);

// POST /api/career-chat — grounded RAG answer for the authenticated student
router.post(
  '/',
  validate(chatSchema),
  asyncHandler(async (req, res) => {
    const { question, conversationId, topK } = req.body;
    let outcome;
    try {
      outcome = await answerQuestion(req.user, question, { limit: topK });
    } catch (err) {
      if (err.code === 'OLLAMA_UNAVAILABLE') {
        return res.status(503).json({
          error: {
            code: 'MODEL_UNAVAILABLE',
            message: 'The career chat model is offline right now. Start Ollama (ollama serve) and retry — answers are never invented.',
          },
        });
      }
      throw err;
    }
    const saved = await persistConversation(req.user._id, conversationId, question, outcome);
    res.json({
      conversationId: saved.conversationId,
      messages: saved.messages,
      grounded: outcome.grounded,
      sources: outcome.sources,
      retrieval: { mode: outcome.mode, notice: outcome.notice || null },
      model: outcome.model || null,
    });
  })
);

// GET /api/career-chat/conversations
router.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    res.json({ items: await listConversations(req.user._id) });
  })
);

// GET /api/career-chat/conversations/:id
router.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    res.json(await getConversation(req.user._id, req.params.id));
  })
);

export default router;
