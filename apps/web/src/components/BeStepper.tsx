import { observer } from 'mobx-react-lite';

interface BeStepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  testPrefix: string;
}

export const BeStepper = observer(
  ({ value, onIncrement, onDecrement, testPrefix }: BeStepperProps) => {
    return (
      <div>
        <button
          type="button"
          aria-label="BE verringern"
          data-testselector={`${testPrefix}-minus`}
          onClick={onDecrement}
        >
          −
        </button>
        <span data-testselector={testPrefix} aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label="BE erhöhen"
          data-testselector={`${testPrefix}-plus`}
          onClick={onIncrement}
        >
          +
        </button>
      </div>
    );
  },
);
