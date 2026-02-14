import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../../store/chatStore';

interface Props {
  onClose: () => void;
}

export default function ThreadList({ onClose }: Props) {
  const { threads, activeThreadId, isLoadingThreads, selectThread, createThread, deleteThread } =
    useChatStore();

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
        <Text className="text-lg font-semibold text-gray-800">Conversations</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleNewChat}
        className="flex-row items-center mx-4 my-3 p-3 bg-primary-50 rounded-xl"
      >
        <Ionicons name="add-circle" size={22} color="#10b981" />
        <Text className="ml-2 text-primary-700 font-medium">New Conversation</Text>
      </TouchableOpacity>

      {isLoadingThreads ? (
        <ActivityIndicator className="mt-6" color="#10b981" />
      ) : (
        <ScrollView className="flex-1 px-4">
          {threads.length === 0 && (
            <Text className="text-gray-400 text-center mt-8">No conversations yet</Text>
          )}
          {threads.map((thread) => (
            <TouchableOpacity
              key={thread.id}
              onPress={() => handleSelect(thread.id)}
              className={`flex-row items-center p-3 rounded-xl mb-1 ${
                activeThreadId === thread.id ? 'bg-primary-50' : 'bg-transparent'
              }`}
            >
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={activeThreadId === thread.id ? '#10b981' : '#9ca3af'}
              />
              <View className="flex-1 ml-3">
                <Text
                  className={`text-sm ${
                    activeThreadId === thread.id ? 'text-primary-700 font-medium' : 'text-gray-700'
                  }`}
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
