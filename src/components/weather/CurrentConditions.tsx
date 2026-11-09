import { describeWeather } from '../../utils/weatherCodes';
import { formatNaiveTime, formatTimeInZone, windDirectionLabel } from '../../utils/format';
import { formatPercentage, formatTemperature, formatWindSpeed } from '../../utils/units';
import type { WeatherSnapshot } from '../../types/weather';
import { WeatherIcon } from './WeatherIcon';
import styles from './CurrentConditions.module.css';

interface Props {
  snapshot: WeatherSnapshot;
}

/** 目前天氣狀況卡片。 */
export function CurrentConditions({ snapshot }: Props) {
  const { current, location, units, timezone } = snapshot;
  const description = describeWeather(current.weatherCode);
  const placeLine = [location.adminArea, location.country].filter(Boolean).join(' · ');

  return (
    <article className={styles.card} aria-label={`${location.name} 目前天氣`}>
      {/* 用 div 而不是 <header>：位於 <article> 內的 <header> 在無障礙樹裡
          不應該是 banner 角色，用 div 可以避免與頁首產生角色衝突。 */}
      <div className={styles.header}>
        <div className={styles.placeBlock}>
          <h2 className={styles.place}>{location.name}</h2>
          {placeLine ? <p className={styles.placeMeta}>{placeLine}</p> : null}
        </div>
        <div className={styles.localTime}>
          <span className={styles.localTimeLabel}>當地時間</span>
          <span className={styles.localTimeValue}>{formatTimeInZone(timezone)}</span>
        </div>
      </div>

      <div className={styles.main}>
        <div>
          <p className={styles.temperature}>
            {formatTemperature(current.temperature, units.temperature)}
          </p>
          <p className={styles.description}>{description.label}</p>
          <p className={styles.feelsLike}>
            體感溫度 {formatTemperature(current.apparentTemperature, units.temperature)}
          </p>
        </div>
        <WeatherIcon
          code={current.weatherCode}
          isDay={current.isDay}
          size={104}
          className={styles.icon}
        />
      </div>

      <dl className={styles.metrics}>
        <Metric label="濕度" value={formatPercentage(current.humidity)} />
        <Metric
          label="風速"
          value={`${formatWindSpeed(current.windSpeed, units.windSpeed)} · ${windDirectionLabel(current.windDirection)}`}
        />
        <Metric label="降水量" value={`${current.precipitation.toFixed(1)} mm`} />
        <Metric label="觀測時間" value={formatNaiveTime(current.observedAt)} />
      </dl>
    </article>
  );
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className={styles.metric}>
      <dt className={styles.metricLabel}>{label}</dt>
      <dd className={styles.metricValue}>{value}</dd>
    </div>
  );
}
