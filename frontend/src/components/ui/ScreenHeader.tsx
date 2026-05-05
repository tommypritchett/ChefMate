import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ScreenHeaderProps {
  /** Header title text */
  title: string;
  /** Show back arrow and call this when pressed */
  onBack?: () => void;
  /** Right-side content (action icons, etc.) */
  rightContent?: React.ReactNode;
  /** Use large (3xl) title for tab screens, or smaller (xl) for sub-pages.
   *  Defaults to 'large' when no onBack, 'small' when onBack is set. */
  size?: 'large' | 'small';
  /** Extra bottom padding class override (default: pb-5 for large, pb-4 for small) */
  paddingBottom?: string;
}

export function ScreenHeader({ title, onBack, rightContent, size, paddingBottom }: ScreenHeaderProps) {
  const resolvedSize = size ?? (onBack ? 'small' : 'large');
  const pb = paddingBottom ?? (resolvedSize === 'large' ? 'pb-5' : 'pb-4');
  const px = resolvedSize === 'large' ? 'px-6' : 'px-5';
  const textSize = resolvedSize === 'large' ? 'text-3xl' : 'text-xl';

  return (
    <View className={`bg-warm-dark pt-14 ${pb} ${px}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {onBack && (
            <TouchableOpacity onPress={onBack} className="mr-2 -ml-1 p-1.5" hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color="#FFFBF5" />
            </TouchableOpacity>
          )}
          <Text className={`text-cream ${textSize} font-serif-bold tracking-tight`}>{title}</Text>
        </View>
        {rightContent && <View className="flex-row gap-2.5">{rightContent}</View>}
      </View>
    </View>
  );
}
