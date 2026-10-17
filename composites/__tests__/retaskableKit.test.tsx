import { fireEvent, render } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import {
  Banner, Checklist, Chip, Choice, Disclosure, Grid, IconButton, Meter, MoreMenu, NumberField,
  Properties, RadioOption, StepTrail, Tile, ToggleRow, UIKit,
} from '../../index';

describe('controls', () => {
  it('Chip reports presses and exposes its state', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<Chip label="Knee" on onPress={onPress} />);
    fireEvent.press(getByLabelText('Knee'));
    expect(onPress).toHaveBeenCalled();
    expect(getByLabelText('Knee').props.accessibilityState).toEqual({ checked: true });
  });

  it('IconButton does not fire when disabled', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<IconButton icon="add" label="Add" onPress={onPress} disabled />);
    fireEvent.press(getByLabelText('Add'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('Choice and RadioOption expose selection', () => {
    const { getByLabelText } = render(
      <>
        <Choice label="Morning" hint="8:00" on onPress={() => {}} />
        <RadioOption label="Mild" on={false} onPress={() => {}} />
      </>,
    );
    expect(getByLabelText('Morning, 8:00').props.accessibilityState).toEqual({ selected: true });
    expect(getByLabelText('Mild').props.accessibilityState).toEqual({ selected: false });
  });

  it('Checklist toggles by index', () => {
    const onToggle = jest.fn();
    const { getByLabelText } = render(
      <Checklist items={[{ text: 'Warm up', on: true }, { text: 'Calf raises', on: false }]} onToggle={onToggle} />,
    );
    fireEvent.press(getByLabelText('Calf raises'));
    expect(onToggle).toHaveBeenCalledWith(1);
  });
});

describe('status', () => {
  it('Meter clamps and reports its value', () => {
    const { getByLabelText } = render(<Meter value={1.7} title="This week" />);
    expect(getByLabelText('This week').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });
  });

  it('Banner announces warnings and dangers as alerts', () => {
    const { UNSAFE_getByProps } = render(<Banner tone="danger" placement="inline">Couldn't save.</Banner>);
    expect(UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
  });

  it('Tile reads as one sentence to a screen reader', () => {
    const { getByLabelText } = render(<Tile label="Sessions" value={12} detail="this week" />);
    expect(getByLabelText('Sessions: 12, this week')).toBeTruthy();
  });

  it('StepTrail marks only the current step selected', () => {
    const { getByText } = render(<StepTrail steps={['Warm up', 'Exercises']} current={1} />);
    expect(getByText('Exercises').props.accessibilityState).toEqual({ selected: true });
    expect(getByText('Warm up').props.accessibilityState).toEqual({ selected: false });
  });
});

describe('structure', () => {
  it('Disclosure hides its content until opened', () => {
    const { getByLabelText, queryByText } = render(
      <Disclosure label="4 steps"><RNText>Sit tall</RNText></Disclosure>,
    );
    expect(queryByText('Sit tall')).toBeNull();
    fireEvent.press(getByLabelText('4 steps'));
    expect(queryByText('Sit tall')).toBeTruthy();
  });

  it('MoreMenu runs the picked item', () => {
    const onDelete = jest.fn();
    const { getByLabelText, getByText } = render(
      <MoreMenu label="More" items={[{ label: 'Delete', onPress: onDelete, danger: true }]} />,
    );
    fireEvent.press(getByLabelText('More'));
    fireEvent.press(getByText('Delete'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('Grid pads the last row so cells keep equal widths', () => {
    const { toJSON } = render(
      <Grid columns={3}>
        <RNText>a</RNText>
        <RNText>b</RNText>
        <RNText>c</RNText>
        <RNText>d</RNText>
      </Grid>,
    );
    const rows = (toJSON() as { children: { children: unknown[] }[] }).children;
    expect(rows).toHaveLength(2);
    expect(rows[1].children).toHaveLength(3);
  });

  it('Properties renders string values', () => {
    const { getByText } = render(<Properties rows={[{ label: 'Frequency', value: 'Daily' }]} />);
    expect(getByText('Daily')).toBeTruthy();
  });
});

describe('fields', () => {
  it('NumberField reports numbers, null when empty, and flags junk', () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = render(<NumberField label="Reps" value={12} onChange={onChange} />);
    fireEvent.changeText(getByLabelText('Reps'), '15');
    expect(onChange).toHaveBeenLastCalledWith(15);
    fireEvent.changeText(getByLabelText('Reps'), '');
    expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.changeText(getByLabelText('Reps'), 'abc');
    expect(getByText('Enter a number.')).toBeTruthy();
  });

  it('a locked ToggleRow shows its state instead of a switch', () => {
    const { getByText, queryByRole } = render(<ToggleRow title="Backups" value locked />);
    expect(getByText('On')).toBeTruthy();
    expect(queryByRole('switch')).toBeNull();
  });
});

describe('UIKit', () => {
  it('renders every section without throwing', () => {
    const { getByText } = render(<UIKit />);
    for (const title of ['Text', 'Buttons', 'Surfaces', 'Status', 'Notices', 'Panels and lists', 'Fields']) {
      expect(getByText(title)).toBeTruthy();
    }
  });
});
