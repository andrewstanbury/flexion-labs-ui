import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthScreenShell } from '../AuthScreenShell';

// AuthScreenShell wraps auth routes in a keyboard-aware scroll container. Under
// jest the keyboard-controller scroll view is mocked to a plain View; pin the
// contract that matters here: title, subtitle, and form children all render.

describe('AuthScreenShell', () => {
  it('renders the title, subtitle and form children', () => {
    const { getByText } = render(
      <AuthScreenShell iconLabel="F" title="Welcome" subtitle="Sign in">
        <Text>Email field</Text>
      </AuthScreenShell>,
    );
    expect(getByText('Welcome')).toBeTruthy();
    expect(getByText('Sign in')).toBeTruthy();
    expect(getByText('Email field')).toBeTruthy();
  });
});
