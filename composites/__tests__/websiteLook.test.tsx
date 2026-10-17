import { fireEvent, render } from '@testing-library/react-native';
import { FilterChips, IconTile, ListGroup, Tag } from '../../index';

describe('FilterChips', () => {
  const chips = [
    { key: 'all', label: 'All', count: 42 },
    { key: 'mine', label: 'Mine' },
  ] as const;

  it('shows counts and reports the tapped key', () => {
    const onSelect = jest.fn();
    const { getByText } = render(<FilterChips chips={chips} selected="all" onSelect={onSelect} />);
    fireEvent.press(getByText('Mine'));
    expect(onSelect).toHaveBeenCalledWith('mine');
    expect(getByText('All 42')).toBeTruthy();
  });

  it('marks only the selected chip as selected', () => {
    const { getByLabelText } = render(<FilterChips chips={chips} selected="mine" onSelect={() => {}} />);
    expect(getByLabelText('Mine').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('All 42').props.accessibilityState).toEqual({ selected: false });
  });
});

describe('ListGroup', () => {
  it('renders a title, rows and fires row presses', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ListGroup title="Needs review">
        <ListGroup.Row title="Calf raise" subtitle="Round 2" onPress={onPress} />
        <ListGroup.Row title="Heel slides" trailing={<Tag label="New" tone="highlight" />} />
      </ListGroup>,
    );
    expect(getByText('Needs review')).toBeTruthy();
    expect(getByText('Round 2')).toBeTruthy();
    expect(getByText('New')).toBeTruthy();
    fireEvent.press(getByText('Calf raise'));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('IconTile', () => {
  it('renders in both tones', () => {
    expect(() => render(<IconTile name="walk-outline" />)).not.toThrow();
    expect(() => render(<IconTile name="walk-outline" tone="highlight" size="lg" />)).not.toThrow();
  });
});
