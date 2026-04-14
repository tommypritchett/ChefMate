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
import { useMealPrepStore } from '../../src/store/chatStore';
import MessageBubble from '../../src/components/chat/MessageBubble';
import ChatInput from '../../src/components/chat/ChatInput';
import ThreadList from '../../src/components/chat/ThreadList';

const MEAL_PREP_PROMPTS = [
  'Easy crockpot meal prep — 10 servings',
  'High protein sheet pan meal prep for the week',
  'Meal prep lunches for the next 5 work days',
  'Batch cook chicken — half fridge, half freezer',
  'Budget meal prep under $30 — 10 servings',
];

export default function MealPrepScreen() {
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
  } = useMealPrepStore();

  const [showThreads, setShowThreads] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadThreads();
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

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-500 pt-3 pb-5 px-5">
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-3xl font-bold tracking-tight">Meal Prep AI</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              testID="meal-prep-thread-list-button"
              onPress={() => setShowThreads(true)}
              className="bg-white/20 w-9 h-9 rounded-xl items-center justify-center"
            >
              <Ionicons name="list" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              testID="meal-prep-new-thread-button"
              onPress={async () => {
                await createThread();
              }}
              className="bg-white/20 w-9 h-9 rounded-xl items-center justify-center"
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showWelcome ? (
        <View className="flex-1 px-5 py-6">
          {/* Welcome Card */}
          <View className="bg-white rounded-3xl p-8 items-center shadow-md mb-6">
            <View className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full items-center justify-center mb-5">
              <Text className="text-5xl">🍳</Text>
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Plan Your Week
            </Text>
            <Text className="text-gray-500 text-center leading-6">
              I'm your meal prep assistant. I'll check your inventory, suggest batch-cooking recipes, and build your shopping list.
            </Text>
          </View>

          {/* Quick Prompts */}
          <Text className="text-gray-700 font-semibold mb-3 px-1 text-base">Quick Start</Text>
          <View className="gap-3">
            {[
              { icon: '🥘', text: 'Easy crockpot meal prep — 10 servings' },
              { icon: '🍗', text: 'High protein sheet pan meal prep for the week' },
              { icon: '🥗', text: 'Meal prep lunches for the next 5 work days' },
              { icon: '❄️', text: 'Batch cook chicken — half fridge, half freezer' },
              { icon: '💰', text: 'Budget meal prep under $30 — 10 servings' },
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
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
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
                <View className="flex-row items-center px-4 mb-3">
                  <View className="rounded-full w-8 h-8 items-center justify-center mr-2" style={{ backgroundColor: '#fff7ed' }}>
                    <Ionicons name="flame" size={16} color="#f97316" />
                  </View>
                  <View className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                    <ActivityIndicator size="small" color="#f97316" />
                  </View>
                </View>
              ) : null}
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

      <ChatInput onSend={handleSend} disabled={isSending} />

      <Modal
        visible={showThreads}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowThreads(false)}
      >
        <ThreadList onClose={() => setShowThreads(false)} store="meal-prep" />
      </Modal>
    </View>
  );
}
