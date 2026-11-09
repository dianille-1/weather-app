import type { Location } from '../types/location';
import styles from './RecentLocations.module.css';

interface Props {
  locations: Location[];
  onSelect: (location: Location) => void;
  onRemove: (id: string) => void;
}

/** 最近瀏覽的地點，讓使用者一鍵切換。 */
export function RecentLocations({ locations, onSelect, onRemove }: Props) {
  if (locations.length === 0) return null;

  return (
    <section className={styles.section} aria-label="最近瀏覽">
      <h2 className={styles.heading}>最近瀏覽</h2>
      <ul className={styles.list}>
        {locations.map((location) => (
          <li key={location.id} className={styles.item}>
            <button type="button" className={styles.pick} onClick={() => onSelect(location)}>
              {location.name}
            </button>
            <button
              type="button"
              className={styles.remove}
              onClick={() => onRemove(location.id)}
              aria-label={`移除 ${location.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
