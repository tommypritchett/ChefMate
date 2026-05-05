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
  const accentColor = '#D4652E';
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
    <View className="flex-1 bg-cream">
      {/* Header — warm dark with eyebrow + serif title */}
      <View
        className="px-6 pt-14 pb-5 bg-warm-dark"
        style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(212,101,46,0.4)' }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-brown-light font-sans-medium text-[10px] tracking-[1.2px] uppercase opacity-80">
              {isMealPrep ? 'Your sessions' : 'Your conversations'}
            </Text>
            <Text className="text-cream text-[22px] font-serif-bold tracking-tight leading-none mt-[2px]">
              {isMealPrep ? 'Meal Prep Sessions' : 'Conversations'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-[38px] h-[38px] rounded-full items-center justify-center"
            style={{
              backgroundColor: 'rgba(255,251,245,0.1)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,251,245,0.2)',
            }}
          >
            <Ionicons name="close" size={20} color="#FFFBF5" />
          </TouchableOpacity>
        </View>
      </View>

      {/* New thread button */}
      <TouchableOpacity
        onPress={handleNewChat}
        className="flex-row items-center mx-5 my-4 p-4 rounded-2xl bg-orange-light"
        style={{
          shadowColor: '#D4652E',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 2,
          borderWidth: 1,
          borderColor: 'rgba(212,101,46,0.15)',
        }}
      >
        <View className="w-9 h-9 bg-orange rounded-full items-center justify-center mr-3">
          <Ionicons name="add" size={20} color="#FFFBF5" />
        </View>
        <Text className="font-sans-semibold text-orange text-[14px]">
          {newLabel}
        </Text>
      </TouchableOpacity>

      {isLoadingThreads ? (
        <ActivityIndicator className="mt-6" color={accentColor} />
      ) : (
        <ScrollView className="flex-1 px-5">
          {threads.length === 0 && (
            <View className="items-center mt-12">
              <View className="w-16 h-16 bg-cream-dark rounded-full items-center justify-center mb-4">
                <Text className="text-[28px]">{isMealPrep ? '🍲' : '💬'}</Text>
              </View>
              <Text className="text-brown font-sans-medium text-center text-sm">
                {isMealPrep ? 'No meal prep sessions yet' : 'No conversations yet'}
              </Text>
              <Text className="text-brown-light font-sans text-center text-xs mt-1">
                Start one to get cooking!
              </Text>
            </View>
          )}
          {threads.map((thread) => {
            const isActive = activeThreadId === thread.id;
            return (
              <TouchableOpacity
                key={thread.id}
                onPress={() => handleSelect(thread.id)}
                className={`flex-row items-center p-4 rounded-2xl mb-2 ${
                  isActive ? 'bg-orange-light' : 'bg-white'
                }`}
                style={
                  isActive
                    ? {
                        borderWidth: 1,
                        borderColor: 'rgba(212,101,46,0.15)',
                      }
                    : {
                        shadowColor: '#2D2520',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 1,
                        borderWidth: 1,
                        borderColor: 'rgba(45,37,32,0.05)',
                      }
                }
                activeOpacity={0.7}
              >
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                    isActive ? 'bg-orange' : 'bg-cream-dark'
                  }`}
                >
                  <Ionicons
                    name={isMealPrep ? 'flame-outline' : 'chatbubble-outline'}
                    size={16}
                    color={isActive ? '#FFFBF5' : '#B8A68E'}
                  />
                </View>
                <View className="flex-1 mr-2">
                  <Text
                    className={`text-sm font-sans-semibold ${
                      isActive ? 'text-orange-dark' : 'text-warm-dark'
                    }`}
                    numberOfLines={1}
                  >
                    {thread.title}
                  </Text>
                  <Text className="text-xs text-brown-light font-sans mt-0.5">
                    {thread._count?.messages || 0} messages
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteThread(thread.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(45,37,32,0.05)' }}
                >
                  <Ionicons name="trash-outline" size={14} color="#B8A68E" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
