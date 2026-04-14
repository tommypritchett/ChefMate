import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useChatStore } from '../../src/store/chatStore';
import MessageBubble from '../../src/components/chat/MessageBubble';
import ChatInput from '../../src/components/chat/ChatInput';
import ThreadList from '../../src/components/chat/ThreadList';
import { healthGoalsApi, inventoryApi } from '../../src/services/api';

const DEFAULT_PROMPTS = [
  'What can I cook tonight?',
  "What's in my inventory?",
];

const GOAL_PROMPTS: Record<string, string> = {
  'high-protein': 'High protein meal ideas',
  'protein': 'High protein meal ideas',
  'low-carb': 'Low carb dinner options',
  'keto': 'Low carb keto-friendly recipes',
  'calories': 'Meals under 500 calories',
  'low-calorie': 'Meals under 500 calories',
  'weight-loss': 'Healthy low-calorie meals',
};

const SHOPPING_PROMPTS = [
  'Add chicken breast and rice to my shopping list',
];

const BUDGET_PROMPTS = [
  'What can I cook for cheap?',
  'Compare prices for my shopping list',
];

function buildQuickPrompts(goals: string[], hasInventory: boolean): string[] {
  const prompts: string[] = [...DEFAULT_PROMPTS];

  // Add goal-based prompts
  for (const goal of goals) {
    const lower = goal.toLowerCase();
    for (const [key, prompt] of Object.entries(GOAL_PROMPTS)) {
      if (lower.includes(key) && !prompts.includes(prompt)) {
        prompts.push(prompt);
        break;
      }
    }
  }

  // Add inventory-aware prompt
  if (hasInventory && prompts.length < 5) {
    prompts.push('Recipes using what I have');
  }

  // Add shopping prompt
  for (const sp of SHOPPING_PROMPTS) {
    if (prompts.length >= 5) break;
    prompts.push(sp);
  }

  // Fill remaining with budget prompts
  for (const bp of BUDGET_PROMPTS) {
    if (prompts.length >= 5) break;
    prompts.push(bp);
  }

  return prompts.slice(0, 5);
}

export default function ChatScreen() {
  const {
    messages,
    activeThreadId,
    isSending,
    streamingContent,
    error,
    loadThreads,
    sendMessage,
    createThread,
    retryLastMessage,
    clearError,
  } = useChatStore();

  const [showThreads, setShowThreads] = useState(false);
  const [quickPrompts, setQuickPrompts] = useState<string[]>(DEFAULT_PROMPTS.concat(BUDGET_PROMPTS));
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadThreads();
    // Load user context to build contextual quick prompts
    (async () => {
      try {
        const [goalsData, invData] = await Promise.all([
          healthGoalsApi.getGoals().catch(() => ({ goals: [] })),
          inventoryApi.getInventory().catch(() => ({ items: [] })),
        ]);
        const goalTypes = (goalsData.goals || [])
          .filter((g: any) => g.isActive)
          .map((g: any) => g.goalType);
        const hasInventory = (invData.items || []).length > 0;
        setQuickPrompts(buildQuickPrompts(goalTypes, hasInventory));
      } catch {
        // Keep defaults
      }
    })();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, streamingContent]);

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage]
  );

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const renderMessage = useCallback(
    ({ item }: { item: any }) => (
      <MessageBubble role={item.role} message={item.message} />
    ),
    []
  );

  // Empty state - no thread selected and no messages
  const showWelcome = messages.length === 0 && !isSending;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-500 pt-3 pb-5 px-5">
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-3xl font-bold tracking-tight">Kitcho AI</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              testID="thread-list-button"
              onPress={() => setShowThreads(true)}
              className="bg-white/20 w-9 h-9 rounded-xl items-center justify-center"
            >
              <Ionicons name="list" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              testID="new-thread-button"
              onPress={async () => {
                await createThread();
              }}
              className="bg-white/20 w-9 h-9 rounded-xl items-center justify-center"
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              testID="profile-icon"
              onPress={() => router.push('/(tabs)/profile')}
              className="bg-white/20 w-9 h-9 rounded-xl items-center justify-center"
            >
              <Ionicons name="person-circle-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showWelcome ? (
        /* Welcome screen */
        <View className="flex-1 px-5 py-6">
          {/* Welcome Card */}
          <View className="bg-white rounded-3xl p-8 items-center shadow-md mb-6">
            <View className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full items-center justify-center mb-5">
              <Text className="text-5xl">🍳</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              What's cooking?
            </Text>
            <Text className="text-gray-500 text-center leading-6">
              I'm your AI cooking companion. Ask me anything about recipes, meal planning, or nutrition!
            </Text>
          </View>

          {/* Quick Prompts */}
          <Text className="text-gray-700 font-semibold mb-3 px-1 text-base">Quick Start</Text>
          <View className="gap-3">
            {[
              { icon: '🍽️', text: 'What can I cook tonight?', badge: null },
              { icon: '🥗', text: quickPrompts.find(p => p.includes('protein') || p.includes('calorie')) || 'High protein meal ideas', badge: quickPrompts.some(p => p.includes('protein') || p.includes('calorie')) ? 'GOAL' : null },
              { icon: '📦', text: "What's in my inventory?", badge: null },
              { icon: '🛒', text: 'Budget meals under $30', badge: null },
              { icon: '⏱️', text: 'Quick 30-minute dinners', badge: null },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex-row items-center shadow-sm active:bg-primary-50 active:border-primary-500"
                onPress={() => handleQuickPrompt(item.text)}
              >
                <View className="bg-primary-50 w-10 h-10 rounded-xl items-center justify-center mr-3">
                  <Text className="text-xl">{item.icon}</Text>
                </View>
                <Text className="text-gray-800 font-medium flex-1">
                  {item.text}
                </Text>
                {item.badge ? (
                  <View className="bg-yellow-100 px-3 py-1 rounded-xl">
                    <Text className="text-yellow-800 text-xs font-bold">{item.badge}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        /* Message list */
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {/* Streaming message */}
              {streamingContent ? (
                <MessageBubble
                  role="assistant"
                  message={streamingContent}
                  isStreaming
                />
              ) : null}
              {/* Loading indicator */}
              {isSending && !streamingContent ? (
                <View className="flex-row items-center px-4 mb-3">
                  <View className="bg-primary-100 rounded-full w-8 h-8 items-center justify-center mr-2">
                    <Ionicons name="leaf" size={16} color="#10b981" />
                  </View>
                  <View className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                    <ActivityIndicator size="small" color="#10b981" />
                  </View>
                </View>
              ) : null}
              {/* Error message with retry */}
              {error && !isSending ? (
                <View className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-xl p-3">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="alert-circle" size={16} color="#ef4444" />
                    <Text className="text-sm text-red-600 ml-1.5 flex-1">{error}</Text>
                  </View>
                  <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity
                      className="bg-red-100 px-3 py-1.5 rounded-lg"
                      onPress={() => retryLastMessage()}
                    >
                      <Text className="text-xs text-red-700 font-medium">Retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="px-3 py-1.5 rounded-lg"
                      onPress={() => clearError()}
                    >
                      <Text className="text-xs text-gray-500">Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </>
          }
        />
      )}

      {/* Chat input */}
      <ChatInput onSend={handleSend} disabled={isSending} />

      {/* Thread list modal */}
      <Modal
        visible={showThreads}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowThreads(false)}
      >
        <ThreadList onClose={() => setShowThreads(false)} />
      </Modal>
    </View>
  );
}
