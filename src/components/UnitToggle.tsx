import { toggleTemperatureUnit } from '../hooks/useUnits';
import type { Units } from '../types/weather';
import styles from './UnitToggle.module.css';

interface Props {
  units: Units;
  onChange: (units: Units) => void;
}

const OPTIONS = [
  { value: 'celsius', label: '°C' },
  { value: 'fahrenheit', label: '°F' },
] as const;

/** 溫度單位切換（°C / °F）。風速單位會一併切換。 */
export function UnitToggle({ units, onChange }: Props) {
  return (
    <div className={styles.toggle} role="group" aria-label="溫度單位">
      {OPTIONS.map((option) => {
        const isActive = units.temperature === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={isActive ? `${styles.option} ${styles.active}` : styles.option}
            aria-pressed={isActive}
            onClick={() => onChange(toggleTemperatureUnit(units))}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
