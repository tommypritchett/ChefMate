import { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { isListening, transcript, isSupported, startListening, stopListening } =
    useSpeechRecognition();

  // When transcript updates from speech recognition, update text input
  useEffect(() => {
    if (transcript) {
      setText(transcript);
    }
  }, [transcript]);

  // Pulse animation while listening
  useEffect(() => {
    if (isListening) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicPress = () => {
    if (isListening) {
      stopListening();
      // Auto-send if we got a transcript
      if (text.trim()) {
        setTimeout(() => {
          const trimmed = text.trim();
          if (trimmed) {
            onSend(trimmed);
            setText('');
          }
        }, 300);
      }
    } else {
      startListening();
    }
  };

  const hasText = text.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <View className="flex-row items-end px-4 py-3 bg-white border-t border-gray-200">
        {/* Mic button - shown when speech is supported and no text typed */}
        {isSupported && !hasText && !disabled && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              onPress={handleMicPress}
              className={`mr-2 w-10 h-10 rounded-full items-center justify-center ${
                isListening ? 'bg-red-500' : 'bg-gray-100'
              }`}
            >
              <Ionicons
                name={isListening ? 'mic' : 'mic-outline'}
                size={20}
                color={isListening ? 'white' : '#6b7280'}
              />
            </TouchableOpacity>
          </Animated.View>
        )}

        <TextInput
          ref={inputRef}
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-[15px] max-h-[120px] text-gray-800"
          placeholder={isListening ? 'Listening...' : 'Ask ChefMate anything...'}
          placeholderTextColor={isListening ? '#ef4444' : '#9ca3af'}
          value={text}
          onChangeText={setText}
          onKeyPress={handleKeyPress}
          multiline
          editable={!disabled && !isListening}
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={!hasText || disabled}
          className={`ml-2 w-10 h-10 rounded-full items-center justify-center ${
            hasText && !disabled ? 'bg-primary-500' : 'bg-gray-200'
          }`}
        >
          <Ionicons
            name="send"
            size={18}
            color={hasText && !disabled ? 'white' : '#9ca3af'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
