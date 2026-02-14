import { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <View className="flex-row items-end px-4 py-3 bg-white border-t border-gray-200">
        <TextInput
          ref={inputRef}
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-[15px] max-h-[120px] text-gray-800"
          placeholder="Ask ChefMate anything..."
          placeholderTextColor="#9ca3af"
          value={text}
          onChangeText={setText}
          onKeyPress={handleKeyPress}
          multiline
          editable={!disabled}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          className={`ml-2 w-10 h-10 rounded-full items-center justify-center ${
            text.trim() && !disabled ? 'bg-primary-500' : 'bg-gray-200'
          }`}
        >
          <Ionicons
            name="send"
            size={18}
            color={text.trim() && !disabled ? 'white' : '#9ca3af'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
