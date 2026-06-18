import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { KeyboardScreen } from '../KeyboardScreen';
import { Input } from '../../primitives/Input';

// KeyboardScreen wraps form content in a keyboard-aware scroll container so the
// focused field stays clear of the on-screen keyboard. Under jest the
// keyboard-controller components render as plain Views (mocked), so here we pin
// the contract that matters at this layer: it renders its children (the form).

describe('KeyboardScreen', () => {
  it('renders its form children', () => {
    const { getByText, getByPlaceholderText } = render(
      <KeyboardScreen>
        <Text>Edit profile</Text>
        <Input placeholder="First name" />
      </KeyboardScreen>,
    );
    expect(getByText('Edit profile')).toBeTruthy();
    expect(getByPlaceholderText('First name')).toBeTruthy();
  });
});
