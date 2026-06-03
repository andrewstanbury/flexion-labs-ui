import { Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { layout } from '../tokens';
import { Screen, type ScreenProps } from '../primitives/Screen';

// KeyboardScreen — Screen + KeyboardAvoidingView + ScrollView combo used
// by every form/auth screen so inputs stay above the on-screen keyboard.
// Pass any form rows or children — they end up in a scrolling, padded
// vertical column.

export type KeyboardScreenProps = Omit<ScreenProps, 'padded' | 'children'> & {
  children: React.ReactNode;
  contentCentered?: boolean; // vertically center when content fits the viewport
};

export function KeyboardScreen({
  children,
  contentCentered = false,
  edges,
  background,
  style,
}: KeyboardScreenProps) {
  return (
    <Screen padded={false} edges={edges} background={background} style={style}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: contentCentered ? 'center' : 'flex-start',
            paddingHorizontal: layout.screenX,
            paddingVertical: layout.screenY,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
