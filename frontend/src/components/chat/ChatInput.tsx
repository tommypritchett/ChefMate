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
      <View
        className="px-4 pt-[10px] pb-3 bg-cream"
        style={{ borderTopWidth: 1, borderTopColor: 'rgba(45,37,32,0.07)' }}
      >
        <View className="flex-row items-end gap-2">
          {/* Mic button — left side */}
          {isSupported ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                onPress={handleMicPress}
                disabled={disabled}
                className={`w-11 h-11 rounded-full items-center justify-center ${
                  isListening ? 'bg-red-500' : 'bg-warm-dark'
                }`}
                style={{
                  shadowColor: '#2D2520',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <Ionicons
                  name={isListening ? 'mic' : 'mic-outline'}
                  size={18}
                  color="#FFFBF5"
                />
              </TouchableOpacity>
            </Animated.View>
          ) : null}

          {/* Input field with send button inside */}
          <View
            className="flex-1 flex-row items-center bg-cream-dark rounded-[22px] px-[14px] py-[10px] gap-2"
            style={{
              borderWidth: 1.5,
              borderColor: 'rgba(45,37,32,0.08)',
            }}
          >
            <TextInput
              ref={inputRef}
              className="flex-1 text-sm text-warm-dark font-sans max-h-[120px]"
              style={{ lineHeight: 20 }}
              placeholder={isListening ? 'Listening...' : 'Ask Kitcho anything...'}
              placeholderTextColor={isListening ? '#ef4444' : '#B8A68E'}
              value={text}
              onChangeText={setText}
              onKeyPress={handleKeyPress}
              multiline
              editable={!disabled && !isListening}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!hasText || disabled}
              className="w-[30px] h-[30px] bg-warm-dark rounded-full items-center justify-center"
            >
              <Ionicons
                name="send"
                size={14}
                color={hasText && !disabled ? '#FFFBF5' : '#B8A68E'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
