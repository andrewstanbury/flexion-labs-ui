import { useEffect, useState } from 'react';
import { FormField } from './FormField';
import { Input, type InputProps } from '../primitives/Input';

// TextField / NumberField (v0.31.0) — a labelled Input in one line instead of
// FormField + Input every time. Errors and hints come from FormField.
export type TextFieldProps = Omit<InputProps, 'value' | 'onChangeText' | 'onChange'> & {
  label: string;
  value: string;
  onChange: (text: string) => void;
  hint?: string | null;
  error?: string | null;
};

export function TextField({ label, value, onChange, hint, error, ...input }: TextFieldProps) {
  return (
    <FormField label={label} hint={hint} error={error}>
      <Input value={value} onChangeText={onChange} invalid={!!error} accessibilityLabel={label} {...input} />
    </FormField>
  );
}

// NumberField keeps the text the user is typing (so "1" → "12" and an
// intermediate empty field work) and reports a number only when it parses.
export type NumberFieldProps = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: number | null;
  onChange: (value: number | null) => void;
  integer?: boolean;
};

export function NumberField({ value, onChange, integer = true, error, ...rest }: NumberFieldProps) {
  const [text, setText] = useState(value === null ? '' : String(value));
  useEffect(() => {
    const parsed = integer ? parseInt(text, 10) : parseFloat(text);
    if (value !== null && parsed !== value) setText(String(value));
    if (value === null && text !== '' && !Number.isNaN(parsed)) setText('');
    // Sync only when the value changes from outside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const parsed = integer ? parseInt(text, 10) : parseFloat(text);
  const invalid = text.trim() !== '' && (Number.isNaN(parsed) || !/^-?\d*([.,]\d*)?$/.test(text.trim()));
  return (
    <TextField
      {...rest}
      value={text}
      keyboardType={integer ? 'number-pad' : 'decimal-pad'}
      error={error ?? (invalid ? 'Enter a number.' : null)}
      onChange={(next) => {
        setText(next);
        const n = integer ? parseInt(next, 10) : parseFloat(next.replace(',', '.'));
        onChange(next.trim() === '' || Number.isNaN(n) ? null : n);
      }}
    />
  );
}
