import { render, fireEvent } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { Input } from '../Input';

type Instance = ReturnType<ReturnType<typeof render>['getByPlaceholderText']>;

// Walk up from a node to the nearest ancestor wired with an onPress handler.
function pressableAncestor(node: Instance): Instance | null {
  let n: Instance | null = node;
  while (n) {
    if (typeof n.props?.onPress === 'function') return n;
    n = n.parent as Instance | null;
  }
  return null;
}

// Characterizes the Input variants. The key contract: Input.Area is a real
// multiline textarea (top-aligned, comfortable height), not the single-line
// box that `Input.Text` is.

describe('Input', () => {
  // The whole bordered field — including its padding — is a single tap target
  // that focuses the input, not just the thin text line.
  it.each(['Text', 'Password', 'Code', 'Area'] as const)(
    '%s focuses the field when its container is tapped',
    (variant) => {
      const Variant = Input[variant];
      const focus = jest.spyOn(TextInput.prototype, 'focus').mockImplementation(() => {});
      const { getByPlaceholderText } = render(<Variant placeholder="field" />);
      const container = pressableAncestor(getByPlaceholderText('field'));
      expect(container).not.toBeNull();
      fireEvent.press(container!);
      expect(focus).toHaveBeenCalled();
      focus.mockRestore();
    },
  );

  it('Text is a single-line field (not multiline)', () => {
    const { getByPlaceholderText } = render(<Input.Text placeholder="name" />);
    const field = getByPlaceholderText('name');
    expect(field.props.multiline).toBeFalsy();
  });

  it('Area is a top-aligned multiline textarea with a comfortable height', () => {
    const { getByPlaceholderText } = render(<Input.Area placeholder="note" />);
    const field = getByPlaceholderText('note');
    expect(field.props.multiline).toBe(true);
    expect(field.props.textAlignVertical).toBe('top');
    const style = Array.isArray(field.props.style)
      ? Object.assign({}, ...field.props.style)
      : field.props.style;
    expect(style.minHeight).toBeGreaterThanOrEqual(72);
  });

  it('forwards value/placeholder', () => {
    const { getByPlaceholderText } = render(<Input.Area value="hi" placeholder="note" />);
    expect(getByPlaceholderText('note').props.value).toBe('hi');
  });
});
