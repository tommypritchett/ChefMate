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
import { useChatStore } from '../../src/store/chatStore';
import MessageBubble from '../../src/components/chat/MessageBubble';
import ChatInput from '../../src/components/chat/ChatInput';
import ThreadList from '../../src/components/chat/ThreadList';

const QUICK_PROMPTS = [
  'What can I cook tonight?',
  'Suggest healthy meal prep ideas',
  'Show me easy chicken recipes',
  "What's in my inventory?",
];

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
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadThreads();
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
      {/* Header actions */}
      <View className="flex-row justify-between px-4 py-2 bg-gray-50">
        <TouchableOpacity
          onPress={() => setShowThreads(true)}
          className="flex-row items-center"
        >
          <Ionicons name="menu" size={22} color="#6b7280" />
          <Text className="ml-1 text-sm text-gray-500">History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            await createThread();
          }}
          className="flex-row items-center"
        >
          <Ionicons name="add" size={22} color="#10b981" />
          <Text className="ml-1 text-sm text-primary-600">New Chat</Text>
        </TouchableOpacity>
      </View>

      {showWelcome ? (
        /* Welcome screen */
        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm w-full max-w-sm">
            <View className="bg-primary-100 rounded-full p-4 mb-4">
              <Ionicons name="chatbubble-ellipses" size={48} color="#10b981" />
            </View>
            <Text className="text-xl font-bold text-gray-800 mb-2">
              ChefMate AI
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              Your personal cooking assistant. Ask me anything about recipes, meal
              planning, or nutrition!
            </Text>
            <View className="w-full gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  className="bg-primary-50 rounded-lg p-3"
                  onPress={() => handleQuickPrompt(prompt)}
                >
                  <Text className="text-primary-700 text-center text-sm">
                    "{prompt}"
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
