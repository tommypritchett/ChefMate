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
  const textColor = isUser ? 'text-cream' : 'text-warm-dark';

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
          <Text key={i} className={`font-sans-bold ${textColor}`}>
            {headerMatch[1]}{i < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      }

      // Bullet points (- item or • item)
      const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/);
      if (bulletMatch) {
        return (
          <Text key={i} className={`font-sans ${textColor}`}>
            {'  •  '}{renderInlineBold(bulletMatch[1], isUser)}{i < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      }

      // Numbered list (1. item)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (numMatch) {
        return (
          <Text key={i} className={`font-sans ${textColor}`}>
            {`  ${numMatch[1]}.  `}{renderInlineBold(numMatch[2], isUser)}{i < lines.length - 1 ? '\n' : ''}
          </Text>
        );
      }

      return (
        <Text key={i} className={`font-sans ${textColor}`}>
          {renderInlineBold(trimmed, isUser)}{i < lines.length - 1 ? '\n' : ''}
        </Text>
      );
    });
  };

  return (
    <View className={`flex-row ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* Assistant avatar */}
      {!isUser && (
        <View
          className="bg-orange-light rounded-full w-8 h-8 items-center justify-center mr-[10px] self-end"
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
      )}
      <View
        className={`max-w-[72%] px-4 py-3 ${isUser ? '' : 'bg-white'}`}
        style={
          isUser
            ? {
                backgroundColor: '#2D2520',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 4,
                shadowColor: '#2D2520',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 3,
              }
            : {
                borderTopLeftRadius: 4,
                borderTopRightRadius: 20,
                borderBottomRightRadius: 20,
                borderBottomLeftRadius: 20,
                shadowColor: '#2D2520',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.10,
                shadowRadius: 20,
                elevation: 3,
              }
        }
      >
        <Text
          className={`text-sm leading-[22px] font-sans ${textColor}`}
          selectable
        >
          {isUser ? displayText : renderFormattedText(displayText)}
          {isStreaming && <Text className="text-orange">|</Text>}
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
              color={isSpeaking ? '#ef4444' : '#B8A68E'}
            />
            <Text className={`text-xs ml-1 font-sans ${isSpeaking ? 'text-red-400' : 'text-brown-light'}`}>
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
        <Text key={i} className="font-sans-bold">
          {boldMatch[1]}
        </Text>
      );
    }
    return part;
  });
}
