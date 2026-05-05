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
  'What can I make with my food right now?',
  'What can I cook for dinner?',
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

  for (const goal of goals) {
    const lower = goal.toLowerCase();
    for (const [key, prompt] of Object.entries(GOAL_PROMPTS)) {
      if (lower.includes(key) && !prompts.includes(prompt)) {
        prompts.push(prompt);
        break;
      }
    }
  }

  if (hasInventory && prompts.length < 5) {
    prompts.push('Recipes using what I have');
  }

  for (const sp of SHOPPING_PROMPTS) {
    if (prompts.length >= 5) break;
    prompts.push(sp);
  }

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
    threads,
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

  const showWelcome = messages.length === 0 && !isSending;

  // Quick prompt cards matching mockup
  const QUICK_CARDS = [
    { icon: '🍳', text: 'What can I make with my food right now?' },
    { icon: '🍽', text: 'What can I cook for dinner?' },
    { icon: '📅', text: 'Plan my meals this week' },
    { icon: '⏱', text: 'Quick 30-min dinner ideas' },
  ];

  // Most recent thread for "Recent" section
  const recentThread = threads.length > 0 ? threads[0] : null;

  return (
    <View className="flex-1 bg-cream">
      {/* Header */}
      <View className="bg-warm-dark pt-14 pb-5 px-6">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-brown-light font-sans-medium text-[10px] tracking-[1.2px] uppercase opacity-80">
              Your kitchen companion
            </Text>
            <Text className="text-cream text-[26px] font-serif-bold tracking-tight leading-none">
              Kitcho<Text className="text-orange"> AI</Text>
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              testID="thread-list-button"
              onPress={() => setShowThreads(true)}
              className="w-[38px] h-[38px] rounded-full items-center justify-center"
              style={{
                backgroundColor: 'rgba(255,251,245,0.1)',
                borderWidth: 1.5,
                borderColor: 'rgba(255,251,245,0.2)',
              }}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#FFFBF5" />
            </TouchableOpacity>
            <TouchableOpacity
              testID="profile-icon"
              onPress={() => router.push('/(tabs)/profile')}
              className="w-[38px] h-[38px] rounded-full items-center justify-center"
              style={{
                backgroundColor: 'rgba(255,251,245,0.1)',
                borderWidth: 1.5,
                borderColor: 'rgba(255,251,245,0.2)',
              }}
            >
              <Ionicons name="person-circle-outline" size={20} color="#FFFBF5" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Subtle orange gradient line at bottom of header */}
      <View
        className="h-[1px]"
        style={{
          background: undefined,
          borderTopWidth: 0,
        }}
      >
        <View
          className="flex-1"
          style={{
            backgroundColor: 'rgba(212,101,46,0.4)',
            height: 1,
          }}
        />
      </View>

      {showWelcome ? (
        /* Welcome screen */
        <View className="flex-1 px-5 pt-6 pb-4">
          {/* Welcome Card */}
          <View
            className="bg-white rounded-[32px] px-6 pt-8 pb-7 items-center mb-5"
            style={{
              shadowColor: '#2D2520',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 32,
              elevation: 6,
            }}
          >
            <View
              className="w-[72px] h-[72px] bg-warm-dark rounded-full items-center justify-center mb-4"
              style={{
                shadowColor: '#2D2520',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
                elevation: 4,
              }}
            >
              <Text className="text-[32px]">🍲</Text>
            </View>
            <Text className="text-[22px] font-serif-semibold text-warm-dark text-center tracking-tight leading-[28px] mb-2">
              Your Personal{'\n'}Kitchen Assistant
            </Text>
            <Text className="text-brown text-center leading-[22px] font-sans text-sm max-w-[260px]">
              Ask me about recipes, meal planning, or what to cook with what's in your kitchen
            </Text>
          </View>

          {/* Prompts Label */}
          <Text className="text-brown-light font-sans-semibold text-[11px] tracking-[1px] uppercase mb-3 px-1">
            Try asking me
          </Text>

          {/* Quick Prompt Cards — 2x2 grid */}
          <View className="flex-row flex-wrap gap-[10px] mb-5">
            {QUICK_CARDS.map((card, idx) => (
              <TouchableOpacity
                key={idx}
                className="bg-cream-dark rounded-2xl py-[14px] px-[10px] items-center"
                style={{
                  width: '48%',
                  shadowColor: '#2D2520',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 2,
                  borderWidth: 1,
                  borderColor: 'rgba(45,37,32,0.06)',
                }}
                onPress={() => handleQuickPrompt(card.text)}
                activeOpacity={0.7}
              >
                <View
                  className="w-10 h-10 bg-warm-dark rounded-full items-center justify-center mb-[10px]"
                  style={{
                    shadowColor: '#2D2520',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    elevation: 3,
                  }}
                >
                  <Text className="text-[18px]">{card.icon}</Text>
                </View>
                <Text className="text-warm-dark font-sans-medium text-[11.5px] text-center leading-[17px]">
                  {card.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Divider — Recent */}
          <View className="flex-row items-center gap-3 mb-4">
            <View className="flex-1 h-[1px] bg-cream-deeper" />
            <Text className="text-brown-light font-sans-medium text-[11px] tracking-[0.8px] uppercase">
              Recent
            </Text>
            <View className="flex-1 h-[1px] bg-cream-deeper" />
          </View>

          {/* Recent Conversation Snippet */}
          {recentThread ? (
            <TouchableOpacity
              testID="thread-list-button"
              onPress={() => setShowThreads(true)}
              className="bg-white rounded-2xl px-4 py-[14px] flex-row items-center"
              style={{
                shadowColor: '#2D2520',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: 1,
                borderColor: 'rgba(45,37,32,0.05)',
              }}
              activeOpacity={0.7}
            >
              <View className="w-9 h-9 bg-orange-light rounded-full items-center justify-center mr-3">
                <Text className="text-[17px]">🍳</Text>
              </View>
              <View className="flex-1 mr-2">
                <Text className="font-sans-semibold text-warm-dark text-[13px] mb-[2px]" numberOfLines={1}>
                  {recentThread.title}
                </Text>
                <Text className="font-sans text-brown-light text-xs" numberOfLines={1}>
                  {recentThread._count?.messages || 0} messages
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#B8A68E" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="thread-list-button"
              onPress={() => setShowThreads(true)}
              className="bg-white rounded-2xl px-4 py-[14px] flex-row items-center"
              style={{
                shadowColor: '#2D2520',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: 1,
                borderColor: 'rgba(45,37,32,0.05)',
              }}
              activeOpacity={0.7}
            >
              <View className="w-9 h-9 bg-orange-light rounded-full items-center justify-center mr-3">
                <Text className="text-[17px]">💬</Text>
              </View>
              <View className="flex-1">
                <Text className="font-sans-medium text-brown text-[13px]">
                  No conversations yet
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* New Thread button - keep accessible */}
          <TouchableOpacity
            testID="new-thread-button"
            onPress={async () => {
              await createThread();
            }}
            className="mt-3 self-center py-2 px-4"
            activeOpacity={0.6}
          >
            <Text className="text-orange font-sans-semibold text-xs">
              + New Conversation
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Message list */
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {streamingContent ? (
                <MessageBubble
                  role="assistant"
                  message={streamingContent}
                  isStreaming
                />
              ) : null}
              {isSending && !streamingContent ? (
                <View className="flex-row items-end mb-3">
                  <View
                    className="bg-orange-light rounded-full w-8 h-8 items-center justify-center mr-[10px]"
                    style={{
                      shadowColor: '#D4652E',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    <Text className="text-[15px]">🍳</Text>
                  </View>
                  <View
                    className="bg-white rounded-[4px_20px_20px_20px] px-[18px] py-[14px]"
                    style={{
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 20,
                      borderBottomRightRadius: 20,
                      borderBottomLeftRadius: 20,
                      shadowColor: '#2D2520',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.10,
                      shadowRadius: 20,
                      elevation: 3,
                    }}
                  >
                    <View className="flex-row items-center gap-1">
                      <View className="w-[5px] h-[5px] rounded-full bg-brown-light opacity-30" />
                      <View className="w-[5px] h-[5px] rounded-full bg-brown-light opacity-60" />
                      <View className="w-[5px] h-[5px] rounded-full bg-brown-light" />
                    </View>
                  </View>
                </View>
              ) : null}
              {error && !isSending ? (
                <View className="mb-3 bg-orange-light border border-orange-soft rounded-xl p-3">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="alert-circle" size={16} color="#D4652E" />
                    <Text className="text-sm text-orange ml-1.5 flex-1 font-sans">{error}</Text>
                  </View>
                  <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity
                      className="bg-orange-soft px-3 py-1.5 rounded-lg"
                      onPress={() => retryLastMessage()}
                    >
                      <Text className="text-xs text-orange font-sans-semibold">Retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="px-3 py-1.5 rounded-lg"
                      onPress={() => clearError()}
                    >
                      <Text className="text-xs text-brown-light font-sans">Dismiss</Text>
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
