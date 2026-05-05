import { useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatState } from '../../store/chatStore';
import MessageBubble from '../chat/MessageBubble';
import ChatInput from '../chat/ChatInput';

const MEAL_PREP_PROMPTS = [
  'Easy crockpot meal prep for the week',
  'High protein sheet pan meal prep',
  'Meal prep lunches for the next 5 work days',
  'Batch cook chicken — half fridge, half freezer',
  'Budget meal prep under $30',
];

export default function SmartMealPrepChat({
  store,
  flatListRef,
  onClose,
  onShowThreads,
}: {
  store: ChatState;
  flatListRef: React.RefObject<FlatList | null>;
  onClose: () => void;
  onShowThreads: () => void;
}) {
  const {
    messages,
    isSending,
    streamingContent,
    error,
    sendMessage,
    createThread,
    retryLastMessage,
    clearError,
  } = store;

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, streamingContent]);

  const handleSend = useCallback((text: string) => sendMessage(text), [sendMessage]);

  const renderMessage = useCallback(
    ({ item }: { item: any }) => (
      <MessageBubble role={item.role} message={item.message} />
    ),
    []
  );

  const showWelcome = messages.length === 0 && !isSending;

  return (
    <View className="flex-1 bg-cream">
      {/* Header */}
      <View className="bg-warm-dark pt-14 pb-5 px-5">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity testID="meal-prep-close-button" onPress={onClose} style={{ backgroundColor: 'rgba(255,251,245,0.1)' }} className="w-9 h-9 rounded-xl items-center justify-center">
            <Ionicons name="close" size={20} color="#FFFBF5" />
          </TouchableOpacity>
          <Text className="text-cream text-2xl font-serif-bold tracking-tight">Meal Prep AI</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity testID="meal-prep-thread-list-button" onPress={onShowThreads} style={{ backgroundColor: 'rgba(255,251,245,0.1)' }} className="w-9 h-9 rounded-xl items-center justify-center">
              <Ionicons name="list" size={20} color="#FFFBF5" />
            </TouchableOpacity>
            <TouchableOpacity testID="meal-prep-new-thread-button" onPress={() => createThread()} style={{ backgroundColor: 'rgba(255,251,245,0.1)' }} className="w-9 h-9 rounded-xl items-center justify-center">
              <Ionicons name="add" size={20} color="#FFFBF5" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showWelcome ? (
        <View className="flex-1 px-5 py-6">
          {/* Welcome Card */}
          <View
            className="bg-white rounded-3xl p-8 items-center mb-6"
            style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
          >
            <View className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full items-center justify-center mb-5">
              <Text className="text-5xl">🍳</Text>
            </View>
            <Text className="text-2xl font-serif-bold text-warm-dark mb-2">
              Plan Your Week
            </Text>
            <Text className="text-brown text-center leading-6 font-sans">
              I'm your meal prep assistant. I'll check your inventory, suggest batch-cooking recipes, and build your shopping list.
            </Text>
          </View>

          {/* Quick Prompts */}
          <Text className="text-warm-soft font-sans-semibold mb-3 px-1 text-base">Quick Start</Text>
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
                className="bg-white border-2 border-cream-deeper rounded-2xl p-4 flex-row items-center"
                style={{ shadowColor: '#2D2520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
                onPress={() => handleSend(item.text)}
              >
                <View className="bg-primary-50 w-10 h-10 rounded-xl items-center justify-center mr-3">
                  <Text className="text-xl">{item.icon}</Text>
                </View>
                <Text className="text-warm-dark font-sans-medium flex-1">
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
                <MessageBubble role="assistant" message={streamingContent} isStreaming />
              ) : null}
              {isSending && !streamingContent ? (
                <View className="flex-row items-center px-4 mb-3">
                  <View className="rounded-full w-8 h-8 items-center justify-center mr-2" style={{ backgroundColor: '#FFF0E8' }}>
                    <Ionicons name="restaurant" size={16} color="#D4652E" />
                  </View>
                  <View className="bg-white border border-cream-deeper rounded-2xl rounded-tl-sm px-4 py-3">
                    <ActivityIndicator size="small" color="#D4652E" />
                  </View>
                </View>
              ) : null}
              {error && !isSending ? (
                <View className="mx-4 mb-3 bg-orange-light border border-orange rounded-xl p-3">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="alert-circle" size={16} color="#EA6C2D" />
                    <Text className="text-sm text-orange ml-1.5 flex-1 font-sans">{error}</Text>
                  </View>
                  <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity className="bg-orange px-3 py-1.5 rounded-lg" onPress={() => retryLastMessage()}>
                      <Text className="text-xs text-cream font-sans-medium">Retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="px-3 py-1.5 rounded-lg" onPress={() => clearError()}>
                      <Text className="text-xs text-brown-light font-sans">Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </>
          }
        />
      )}

      <ChatInput onSend={handleSend} disabled={isSending} />
    </View>
  );
}
