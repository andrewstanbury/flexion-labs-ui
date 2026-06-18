import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { layout } from '../tokens';
import { Screen, type ScreenProps } from '../primitives/Screen';

// KeyboardScreen — the single wrapper for any screen with text input. Built on
// react-native-keyboard-controller's KeyboardAwareScrollView (the apps mount its
// <KeyboardProvider> at the root), so the FOCUSED field is automatically scrolled
// clear of the on-screen keyboard on BOTH iOS and Android — unlike the bare RN
// KeyboardAvoidingView this used to use, which is unreliable on Android.
//
// Dismissal is consistent too: tapping a non-interactive area dismisses the
// keyboard (`keyboardShouldPersistTaps="handled"`) and on iOS you can swipe it
// down (`keyboardDismissMode="interactive"`).
//
// Use this for FORMS (a vertical column of fields). For a screen that is mostly a
// FlatList of results with a search box, don't wrap the list in here — use a
// sticky search header + list-level dismissal instead.

export type KeyboardScreenProps = Omit<ScreenProps, 'padded' | 'children'> & {
  children: React.ReactNode;
  contentCentered?: boolean; // vertically center when content fits the viewport
  // Extra gap kept between the focused field and the top of the keyboard.
  bottomOffset?: number;
};

export function KeyboardScreen({
  children,
  contentCentered = false,
  bottomOffset = 24,
  edges,
  background,
  style,
}: KeyboardScreenProps) {
  return (
    <Screen padded={false} edges={edges} background={background} style={style}>
      <KeyboardAwareScrollView
        bottomOffset={bottomOffset}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: contentCentered ? 'center' : 'flex-start',
          paddingHorizontal: layout.screenX,
          paddingVertical: layout.screenY,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </KeyboardAwareScrollView>
    </Screen>
  );
}
