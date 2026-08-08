import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Round icon badge leading a settings row. Lifted from flexion-labs-client
// (where it was already documented as "sits on the design-system allowlist
// pending a shared Badge primitive") — practitioner had no equivalent at all.
export function IconBubble({
  name,
  color,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return (
    <View className="w-10 h-10 rounded-full bg-blossom-50 dark:bg-sand-700 items-center justify-center">
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}
