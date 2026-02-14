import express from 'express';
import prisma from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { chatOrchestrate, chatOrchestrateStream } from '../services/openai';

const router = express.Router();

// GET /api/conversations — List user's conversation threads
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const threads = await prisma.conversationThread.findMany({
      where: { userId: req.user!.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { message: true, role: true, createdAt: true }
        },
        _count: { select: { messages: true } }
      }
    });

    res.json({ threads });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/conversations — Create a new conversation thread
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { title } = req.body;

    const thread = await prisma.conversationThread.create({
      data: {
        userId: req.user!.userId,
        title: title || 'New Conversation'
      }
    });

    res.status(201).json({ thread });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/conversations/:id — Get a conversation thread with messages
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const thread = await prisma.conversationThread.findFirst({
      where: { id, userId: req.user!.userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!thread) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ thread });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// PATCH /api/conversations/:id — Update a conversation thread
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { title, isActive } = req.body;

    const thread = await prisma.conversationThread.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!thread) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.conversationThread.update({
      where: { id },
      data: updateData
    });

    res.json({ thread: updated });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// DELETE /api/conversations/:id — Delete a conversation thread
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const thread = await prisma.conversationThread.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!thread) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await prisma.conversationThread.delete({ where: { id } });

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// POST /api/conversations/:id/messages — Send a message and get AI response
router.post('/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify thread belongs to user
    const thread = await prisma.conversationThread.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!thread) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        userId: req.user!.userId,
        threadId: id,
        role: 'user',
        message: message.trim(),
        contextType: 'chat'
      }
    });

    // Orchestrate AI response with function calling
    const result = await chatOrchestrate(message.trim(), req.user!.userId, id);

    // Save AI response with metadata
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        userId: req.user!.userId,
        threadId: id,
        role: 'assistant',
        message: result.content,
        contextType: 'chat',
        contextData: result.toolCalls.length > 0
          ? JSON.stringify({
              toolCalls: result.toolCalls.map(tc => ({ name: tc.name, args: tc.args })),
              metadata: result.metadata,
            })
          : null,
        tokensUsed: result.usage?.totalTokens || null
      }
    });

    // Auto-title first message
    const messageCount = await prisma.chatMessage.count({ where: { threadId: id } });
    if (messageCount <= 2 && thread.title === 'New Conversation') {
      const titlePreview = message.trim().substring(0, 50) + (message.length > 50 ? '...' : '');
      await prisma.conversationThread.update({
        where: { id },
        data: { title: titlePreview }
      });
    }

    res.status(201).json({
      userMessage,
      assistantMessage,
      toolCalls: result.toolCalls,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/conversations/:id/messages/stream — SSE streaming message endpoint
router.post('/:id/messages/stream', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const thread = await prisma.conversationThread.findFirst({
      where: { id, userId: req.user!.userId }
    });

    if (!thread) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        userId: req.user!.userId,
        threadId: id,
        role: 'user',
        message: message.trim(),
        contextType: 'chat'
      }
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Stream AI response
    const result = await chatOrchestrateStream(
      message.trim(),
      req.user!.userId,
      id,
      // onToken
      (token) => {
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      },
      // onToolCall
      (name, args) => {
        res.write(`data: ${JSON.stringify({ type: 'tool_call', name, args })}\n\n`);
      },
      // onToolResult
      (name, toolResult) => {
        res.write(`data: ${JSON.stringify({ type: 'tool_result', name, result: toolResult })}\n\n`);
      }
    );

    // Save assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        userId: req.user!.userId,
        threadId: id,
        role: 'assistant',
        message: result.content,
        contextType: 'chat',
        contextData: result.toolCalls.length > 0
          ? JSON.stringify({
              toolCalls: result.toolCalls.map(tc => ({ name: tc.name, args: tc.args })),
              metadata: result.metadata,
            })
          : null
      }
    });

    // Auto-title
    const messageCount = await prisma.chatMessage.count({ where: { threadId: id } });
    if (messageCount <= 2 && thread.title === 'New Conversation') {
      const titlePreview = message.trim().substring(0, 50) + (message.length > 50 ? '...' : '');
      await prisma.conversationThread.update({
        where: { id },
        data: { title: titlePreview }
      });
    }

    // Send done event with final data
    res.write(`data: ${JSON.stringify({
      type: 'done',
      messageId: assistantMessage.id,
      content: result.content,
      toolCalls: result.toolCalls,
      metadata: result.metadata
    })}\n\n`);

    res.end();
  } catch (error) {
    console.error('Stream message error:', error);
    // If headers already sent, send error event
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'Failed to stream message' });
    }
  }
});

export default router;
