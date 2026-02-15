import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

interface Props {
  role: 'user' | 'assistant';
  message: string;
  isStreaming?: boolean;
}

export default function MessageBubble({ role, message, isStreaming }: Props) {
  const isUser = role === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    // Strip markdown-like formatting for cleaner TTS
    const cleanText = message
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/[-•]\s/g, '');

    setIsSpeaking(true);
    Speech.speak(cleanText, {
      language: 'en-US',
      rate: 0.95,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

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

        {/* TTS button for assistant messages */}
        {!isUser && !isStreaming && message.length > 10 && (
          <TouchableOpacity
            onPress={handleSpeak}
            className="flex-row items-center mt-2 self-start"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isSpeaking ? 'stop-circle-outline' : 'volume-medium-outline'}
              size={16}
              color={isSpeaking ? '#ef4444' : '#9ca3af'}
            />
            <Text className={`text-xs ml-1 ${isSpeaking ? 'text-red-400' : 'text-gray-400'}`}>
              {isSpeaking ? 'Stop' : 'Listen'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
