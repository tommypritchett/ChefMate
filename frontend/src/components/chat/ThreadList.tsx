import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore, useMealPrepStore } from '../../store/chatStore';

interface Props {
  onClose: () => void;
  store?: 'chat' | 'meal-prep';
}

export default function ThreadList({ onClose, store = 'chat' }: Props) {
  const chatStore = useChatStore();
  const mealPrepStore = useMealPrepStore();
  const s = store === 'meal-prep' ? mealPrepStore : chatStore;

  const { threads, activeThreadId, isLoadingThreads } = s;
  const selectThread = s.selectThread;
  const createThread = s.createThread;
  const deleteThread = s.deleteThread;

  const isMealPrep = store === 'meal-prep';
  const accentColor = '#10b981'; // Emerald for both chat and meal prep
  const newLabel = isMealPrep ? 'New Prep' : 'New Conversation';

  const handleNewChat = async () => {
    await createThread();
    onClose();
  };

  const handleSelect = async (threadId: string) => {
    await selectThread(threadId);
    onClose();
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <Text className="text-lg font-semibold text-gray-800">
          {isMealPrep ? 'Meal Prep Sessions' : 'Conversations'}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleNewChat}
        className="flex-row items-center mx-4 my-3 p-3 rounded-xl bg-primary-50"
      >
        <Ionicons name="add-circle" size={22} color={accentColor} />
        <Text className="ml-2 font-medium text-primary-700">
          {newLabel}
        </Text>
      </TouchableOpacity>

      {isLoadingThreads ? (
        <ActivityIndicator className="mt-6" color={accentColor} />
      ) : (
        <ScrollView className="flex-1 px-4">
          {threads.length === 0 && (
            <Text className="text-gray-400 text-center mt-8">
              {isMealPrep ? 'No meal prep sessions yet' : 'No conversations yet'}
            </Text>
          )}
          {threads.map((thread) => (
            <TouchableOpacity
              key={thread.id}
              onPress={() => handleSelect(thread.id)}
              className={`flex-row items-center p-3 rounded-xl mb-1 ${
                activeThreadId === thread.id
                  ? 'bg-primary-50'
                  : 'bg-transparent'
              }`}
            >
              <Ionicons
                name={isMealPrep ? 'flame-outline' : 'chatbubble-outline'}
                size={18}
                color={activeThreadId === thread.id ? accentColor : '#9ca3af'}
              />
              <View className="flex-1 ml-3">
                <Text
                  className={`text-sm ${
                    activeThreadId === thread.id ? 'font-medium' : 'text-gray-700'
                  }`}
                  style={activeThreadId === thread.id ? { color: isMealPrep ? '#c2410c' : '#047857' } : undefined}
                  numberOfLines={1}
                >
                  {thread.title}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  {thread._count?.messages || 0} messages
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => deleteThread(thread.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={16} color="#d1d5db" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
