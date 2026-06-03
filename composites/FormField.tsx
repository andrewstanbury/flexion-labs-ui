import { View } from 'react-native';
import { layout } from '../tokens';
import { Text } from '../primitives/Text';

// FormField — label + input + optional error message. Use as the smallest
// unit of a form; pass any `<Input.*>` (or other control) as the child.

export type FormFieldProps = {
  label?: string;
  error?: string | null;
  hint?: string | null;
  children: React.ReactNode;
};

export function FormField({ label, error, hint, children }: FormFieldProps) {
  return (
    <View style={{ gap: layout.gapXs }}>
      {label ? <Text variant="label" color="secondary">{label}</Text> : null}
      {children}
      {error ? (
        <Text variant="caption" color="danger">{error}</Text>
      ) : hint ? (
        <Text variant="caption" color="muted">{hint}</Text>
      ) : null}
    </View>
  );
}
