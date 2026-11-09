import { formatForecastDay, todayISO } from '../../utils/format';
import { describeWeather } from '../../utils/weatherCodes';
import { formatPercentage, formatTemperature } from '../../utils/units';
import type { DailyForecast, Units } from '../../types/weather';
import { WeatherIcon } from './WeatherIcon';
import styles from './ForecastSection.module.css';

interface Props {
  daily: DailyForecast[];
  units: Units;
}

/** 未來一週的每日預報。 */
export function ForecastSection({ daily, units }: Props) {
  const today = todayISO();

  if (daily.length === 0) return null;

  return (
    <section className={styles.section} aria-label="天氣預報">
      <h2 className={styles.heading}>天氣預報</h2>
      <ul className={styles.list}>
        {daily.map((day) => (
          <li key={day.date}>
            <ForecastDayCard day={day} units={units} today={today} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface CardProps {
  day: DailyForecast;
  units: Units;
  today: string;
}

function ForecastDayCard({ day, units, today }: CardProps) {
  const description = describeWeather(day.weatherCode);
  const hasPrecipitation = day.precipitationProbability > 0;

  return (
    <article className={styles.card}>
      <div className={styles.day}>
        <span className={styles.date}>{formatForecastDay(day.date, today)}</span>
        <span className={styles.description}>{description.label}</span>
      </div>

      <WeatherIcon code={day.weatherCode} size={34} className={styles.icon} />

      <div className={styles.precipitation}>
        {hasPrecipitation ? (
          <span className={styles.precipitationValue}>
            {formatPercentage(day.precipitationProbability)}
          </span>
        ) : (
          <span className={styles.precipitationPlaceholder}>—</span>
        )}
      </div>

      <div className={styles.temperatures}>
        <span className={styles.min}>{formatTemperature(day.temperatureMin, units.temperature)}</span>
        <span className={styles.max}>{formatTemperature(day.temperatureMax, units.temperature)}</span>
      </div>
    </article>
  );
}
