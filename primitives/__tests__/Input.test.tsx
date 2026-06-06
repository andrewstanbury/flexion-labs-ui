import { render } from '@testing-library/react-native';
import { Input } from '../Input';

// Characterizes the Input variants. The key contract: Input.Area is a real
// multiline textarea (top-aligned, comfortable height), not the single-line
// box that `Input.Text` is.

describe('Input', () => {
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
