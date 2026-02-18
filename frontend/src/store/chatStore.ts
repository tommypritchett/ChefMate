import { create } from 'zustand';
import { conversationsApi } from '../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  createdAt: string;
  contextData?: string | null;
  isStreaming?: boolean;
}

interface ConversationThread {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  _count?: { messages: number };
}

interface ChatState {
  threads: ConversationThread[];
  activeThreadId: string | null;
  messages: ChatMessage[];
  isLoadingThreads: boolean;
  isSending: boolean;
  streamingContent: string;
  error: string | null;

  loadThreads: () => Promise<void>;
  createThread: () => Promise<string>;
  selectThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  clearError: () => void;
  appendStreamToken: (token: string) => void;
  finalizeStream: (messageId: string, content: string, metadata?: any) => void;
  clearStreamingContent: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  messages: [],
  isLoadingThreads: false,
  isSending: false,
  streamingContent: '',
  error: null,

  loadThreads: async () => {
    set({ isLoadingThreads: true });
    try {
      const { threads } = await conversationsApi.getThreads();
      set({ threads, isLoadingThreads: false });
    } catch (error) {
      console.error('Failed to load threads:', error);
      set({ isLoadingThreads: false });
    }
  },

  createThread: async () => {
    try {
      const { thread } = await conversationsApi.createThread();
      set((state) => ({
        threads: [thread, ...state.threads],
        activeThreadId: thread.id,
        messages: [],
      }));
      return thread.id;
    } catch (error) {
      console.error('Failed to create thread:', error);
      throw error;
    }
  },

  selectThread: async (threadId: string) => {
    set({ activeThreadId: threadId, messages: [], streamingContent: '' });
    try {
      const { thread } = await conversationsApi.getThread(threadId);
      set({ messages: thread.messages || [] });
    } catch (error) {
      console.error('Failed to load thread:', error);
    }
  },

  deleteThread: async (threadId: string) => {
    try {
      await conversationsApi.deleteThread(threadId);
      set((state) => {
        const threads = state.threads.filter((t) => t.id !== threadId);
        const activeThreadId =
          state.activeThreadId === threadId ? null : state.activeThreadId;
        return { threads, activeThreadId, messages: activeThreadId ? state.messages : [] };
      });
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  },

  sendMessage: async (message: string) => {
    const state = get();
    let threadId = state.activeThreadId;

    // Auto-create thread if none selected
    if (!threadId) {
      threadId = await get().createThread();
    }

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      message,
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, tempUserMsg],
      isSending: true,
      streamingContent: '',
    }));

    try {
      const response = await conversationsApi.sendMessage(threadId, message);

      // Replace temp message with real ones
      set((s) => {
        const messages = s.messages.filter((m) => m.id !== tempUserMsg.id);
        return {
          messages: [
            ...messages,
            response.userMessage,
            response.assistantMessage,
          ],
          isSending: false,
          error: null,
        };
      });

      // Update thread title in the list
      get().loadThreads();
    } catch (error: any) {
      console.error('Failed to send message:', error);
      let errorMsg = 'Something went wrong. Tap "Retry" to try again.';
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
        errorMsg = 'Cannot connect to server. Make sure the backend is running.';
      } else if (error?.code === 'ECONNABORTED') {
        errorMsg = 'Request timed out. The AI may be processing — tap Retry.';
      } else if (error?.response?.status === 500) {
        errorMsg = 'Server error. The AI may be temporarily unavailable — tap Retry.';
      } else if (error?.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      set({ isSending: false, error: errorMsg });
    }
  },

  retryLastMessage: async () => {
    const state = get();
    // Find the last user message to retry
    const lastUserMsg = [...state.messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;
    // Clear error and remove the failed user message, then resend
    set({ error: null });
    await get().sendMessage(lastUserMsg.message);
  },

  clearError: () => {
    set({ error: null });
  },

  appendStreamToken: (token: string) => {
    set((s) => ({ streamingContent: s.streamingContent + token }));
  },

  finalizeStream: (messageId: string, content: string, metadata?: any) => {
    const assistantMsg: ChatMessage = {
      id: messageId,
      role: 'assistant',
      message: content,
      createdAt: new Date().toISOString(),
      contextData: metadata ? JSON.stringify(metadata) : null,
    };

    set((s) => ({
      messages: [...s.messages, assistantMsg],
      streamingContent: '',
      isSending: false,
    }));

    get().loadThreads();
  },

  clearStreamingContent: () => {
    set({ streamingContent: '' });
  },
}));
