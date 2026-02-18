import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

interface Props {
  role: 'user' | 'assistant';
  message: string;
  isStreaming?: boolean;
}

// Parse message into segments: plain text, bold, bullet points, headers
// Strips image markdown since we can't render images in chat bubbles
function parseMessageSegments(text: string) {
  // Remove image markdown: ![alt](url)
  const cleaned = text.replace(/!\[.*?\]\(.*?\)/g, '');
  // Split by lines for rendering
  return cleaned;
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

    const cleanText = message
      .replace(/!\[.*?\]\(.*?\)/g, '')
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

  const displayText = parseMessageSegments(message);
  const textColor = isUser ? 'text-white' : 'text-gray-800';

  // Render text with basic markdown (bold, headers, bullets)
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return i < lines.length - 1 ? <Text key={i}>{'\n'}</Text> : null;

      // Header lines (### Header)
      const headerMatch = trimmed.match(/^#{1,3}\s+(.+)/);
      if (headerMatch) {
        return (
          <Text key={i} className={`font-bold ${textColor}`}>
            {headerMatch[1]}{i < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      }

      // Bullet points (- item or • item)
      const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/);
      if (bulletMatch) {
        return (
          <Text key={i} className={textColor}>
            {'  •  '}{renderInlineBold(bulletMatch[1], isUser)}{i < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      }

      // Numbered list (1. item)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (numMatch) {
        return (
          <Text key={i} className={textColor}>
            {`  ${numMatch[1]}.  `}{renderInlineBold(numMatch[2], isUser)}{i < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      }

      return (
        <Text key={i} className={textColor}>
          {renderInlineBold(trimmed, isUser)}{i < lines.length - 1 ? '\n' : ''}
        </Text>
      );
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
          className={`text-[15px] leading-[22px] ${textColor}`}
          selectable
        >
          {isUser ? displayText : renderFormattedText(displayText)}
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

// Render inline bold (**text**) within a line
function renderInlineBold(text: string, isUser: boolean) {
  const parts = text.split(/(\*\*.*?\*\*)/);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
    if (boldMatch) {
      return (
        <Text key={i} style={{ fontWeight: 'bold' }}>
          {boldMatch[1]}
        </Text>
      );
    }
    return part;
  });
}
