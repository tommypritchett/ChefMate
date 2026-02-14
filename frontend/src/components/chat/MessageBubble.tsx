import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  role: 'user' | 'assistant';
  message: string;
  isStreaming?: boolean;
}

export default function MessageBubble({ role, message, isStreaming }: Props) {
  const isUser = role === 'user';

  return (
    <View className={`flex-row ${isUser ? 'justify-end' : 'justify-start'} mb-3 px-4`}>
      {!isUser && (
        <View className="bg-primary-100 rounded-full w-8 h-8 items-center justify-center mr-2 mt-1">
          <Ionicons name="leaf" size={16} color="#10b981" />
        </View>
      )}
      <View
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary-500 rounded-tr-sm'
            : 'bg-white border border-gray-200 rounded-tl-sm'
        }`}
      >
        <Text
          className={`text-[15px] leading-[22px] ${isUser ? 'text-white' : 'text-gray-800'}`}
          selectable
        >
          {message}
          {isStreaming && <Text className="text-primary-400">|</Text>}
        </Text>
      </View>
    </View>
  );
}
