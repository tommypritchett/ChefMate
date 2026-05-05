import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConvoMessage } from './inventoryHelpers';

interface ConversationalAddModalProps {
  visible: boolean;
  onClose: () => void;
  convoMode: 'text' | 'voice';
  setConvoMode: (mode: 'text' | 'voice') => void;
  convoInput: string;
  setConvoInput: (text: string) => void;
  convoMessages: ConvoMessage[];
  convoProcessing: boolean;
  convoScrollRef: React.RefObject<ScrollView | null>;
  onSend: () => void;
  onVoiceToggle: () => void;
  isListening: boolean;
  isSupported: boolean;
  onStopListening: () => void;
}

export default function ConversationalAddModal({
  visible, onClose, convoMode, setConvoMode,
  convoInput, setConvoInput, convoMessages, convoProcessing, convoScrollRef,
  onSend, onVoiceToggle, isListening, isSupported, onStopListening,
}: ConversationalAddModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => onClose()}>
      <KeyboardAvoidingView
        className="flex-1"
        style={{ backgroundColor: '#FFFBF5' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={{ backgroundColor: '#2D2520', paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center" style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="arrow-back" size={18} color="#FFFBF5" />
              </TouchableOpacity>
              <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#FFFBF5' }}>Quick Add</Text>
            </View>
          </View>
        </View>

        {/* Mode toggle */}
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 20,
            marginTop: 12,
            backgroundColor: '#F5EDE0',
            borderRadius: 12,
            padding: 2,
          }}
        >
          <TouchableOpacity
            onPress={() => { setConvoMode('text'); if (isListening) onStopListening(); }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: convoMode === 'text' ? '#FFFFFF' : 'transparent',
            }}
          >
            <Text style={{ fontFamily: convoMode === 'text' ? 'DMSans_600SemiBold' : 'DMSans_500Medium', fontSize: 13, color: convoMode === 'text' ? '#2D2520' : '#8B7355' }}>
              ✏️ Text
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setConvoMode('voice')}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: convoMode === 'voice' ? '#FFFFFF' : 'transparent',
            }}
          >
            <Text style={{ fontFamily: convoMode === 'voice' ? 'DMSans_600SemiBold' : 'DMSans_500Medium', fontSize: 13, color: convoMode === 'voice' ? '#2D2520' : '#8B7355' }}>
              🎤 Voice {isSupported ? '' : '(web only)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={convoScrollRef as any}
          className="flex-1 px-5 pt-3"
          contentContainerStyle={{ paddingBottom: 10 }}
          onContentSizeChange={() => (convoScrollRef.current as any)?.scrollToEnd({ animated: true })}
        >
          {convoMessages.map((msg, i) => (
            <View
              key={i}
              className={`mb-2 max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}
            >
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 16,
                  backgroundColor: msg.role === 'user' ? '#2D2520' : '#FFFFFF',
                  borderWidth: msg.role === 'assistant' ? 1 : 0,
                  borderColor: 'rgba(45,37,32,0.05)',
                  shadowColor: msg.role === 'assistant' ? '#2D2520' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: msg.role === 'assistant' ? 0.08 : 0,
                  shadowRadius: 12,
                  elevation: msg.role === 'assistant' ? 2 : 0,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: msg.role === 'user' ? '#FFFBF5' : '#2D2520', lineHeight: 20 }}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
          {convoProcessing && (
            <View className="self-start mb-2">
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: 'rgba(45,37,32,0.05)',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  shadowColor: '#2D2520',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 12,
                  elevation: 2,
                }}
              >
                <ActivityIndicator size="small" color="#D4652E" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input area */}
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#ECD9C6' }}>
          {convoMode === 'text' ? (
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: '#F5EDE0',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: '#2D2520',
                }}
                placeholder="e.g. I bought chicken, rice, and onions"
                placeholderTextColor="#B09880"
                value={convoInput}
                onChangeText={setConvoInput}
                onSubmitEditing={onSend}
                returnKeyType="send"
                editable={!convoProcessing}
              />
              <TouchableOpacity
                onPress={onSend}
                disabled={!convoInput.trim() || convoProcessing}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: convoInput.trim() && !convoProcessing ? '#2D2520' : '#F5EDE0',
                }}
              >
                <Ionicons name="send" size={18} color={convoInput.trim() && !convoProcessing ? '#FFFBF5' : '#B09880'} />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center" style={{ gap: 8 }}>
              {convoInput ? (
                <View className="w-full flex-row items-center" style={{ gap: 8 }}>
                  <Text
                    style={{
                      flex: 1,
                      backgroundColor: '#F5EDE0',
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 11,
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 14,
                      color: '#2D2520',
                    }}
                  >
                    {convoInput}
                  </Text>
                  <TouchableOpacity
                    onPress={onSend}
                    disabled={convoProcessing}
                    style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D2520' }}
                  >
                    <Ionicons name="send" size={18} color="#FFFBF5" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={onVoiceToggle}
                disabled={!isSupported || convoProcessing}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isListening ? '#ef4444' : isSupported ? '#2D2520' : '#F5EDE0',
                  shadowColor: '#2D2520',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 24,
                  elevation: 6,
                }}
              >
                <Ionicons
                  name={isListening ? 'mic' : 'mic-outline'}
                  size={28}
                  color={isSupported ? '#FFFBF5' : '#B09880'}
                />
              </TouchableOpacity>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: isListening ? '#D4652E' : '#B09880', letterSpacing: 0.4 }}>
                {isListening ? 'Listening... tap to stop' : isSupported ? 'Tap to speak' : 'Voice not supported on this device'}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
