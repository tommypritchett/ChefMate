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

  loadThreads: () => Promise<void>;
  createThread: () => Promise<string>;
  selectThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
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
        };
      });

      // Update thread title in the list
      get().loadThreads();
    } catch (error) {
      console.error('Failed to send message:', error);
      set({ isSending: false });
    }
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
