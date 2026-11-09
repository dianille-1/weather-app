import { describeWeather } from '../../utils/weatherCodes';
import type { WeatherIconKey } from '../../utils/weatherCodes';

interface Props {
  /** WMO 天氣代碼。 */
  code: number;
  /** 是否為白天（決定太陽 / 月亮）。 */
  isDay?: boolean;
  size?: number;
  className?: string;
  /** 無障礙標題；不傳則視為裝飾性圖示。 */
  title?: string;
}

/**
 * 天氣圖示。
 *
 * 以 inline SVG 實作，不依賴任何 icon 套件：
 *   - bundle 不會因為 icon 函式庫而變大
 *   - 可以直接用 CSS currentColor 跟著主題色變化
 */
export function WeatherIcon({ code, isDay = true, size = 48, className, title }: Props) {
  const { icon } = describeWeather(code);
  const decorative = title === undefined;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
    >
      {title !== undefined ? <title>{title}</title> : null}
      {renderIcon(icon, isDay)}
    </svg>
  );
}

const CLOUD_PATH =
  'M9.6 23.4h12.1a4.2 4.2 0 0 0 .5-8.37A6.3 6.3 0 0 0 10.2 12.7 4.7 4.7 0 0 0 9.6 23.4Z';

/** 雲朵在原始座標中的中心點，用來做「以自身為中心縮放」的換算。 */
const CLOUD_CENTER = { x: 16, y: 18 };

const BOLT_PATH = 'M17.6 19.6h-4.6l3.7 4.6-1.3 3.9 6.1-5.4h-3.6l-1.7-3.1Z';

function renderIcon(icon: WeatherIconKey, isDay: boolean) {
  switch (icon) {
    case 'clear':
      return isDay ? <Sun /> : <Moon />;
    case 'mostly-clear':
      return (
        <g>
          {isDay ? <Sun /> : <Moon />}
          <Cloud scale={0.75} cx={19} cy={20} />
        </g>
      );
    case 'partly-cloudy':
      return (
        <g>
          {isDay ? <Sun /> : <Moon />}
          <Cloud scale={0.9} cx={18} cy={20} />
        </g>
      );
    case 'overcast':
      return (
        <g>
          <Cloud scale={0.8} cx={13} cy={15} opacity={0.55} />
          <Cloud scale={1} cx={16} cy={19} />
        </g>
      );
    case 'fog':
      return (
        <g>
          <Cloud scale={0.92} cx={16} cy={15.5} />
          <FogLines />
        </g>
      );
    case 'drizzle':
      return (
        <g>
          <Cloud scale={0.92} cx={16} cy={14.5} />
          <RainLines length={4} />
        </g>
      );
    case 'rain':
      return (
        <g>
          <Cloud scale={0.92} cx={16} cy={14.5} />
          <RainLines length={6.5} />
        </g>
      );
    case 'showers':
      return (
        <g>
          <Cloud scale={0.92} cx={16} cy={14.5} />
          <RainLines length={8} />
        </g>
      );
    case 'freezing':
      return (
        <g>
          <Cloud scale={0.92} cx={16} cy={14.5} />
          <RainLines length={4} />
          <Snowflake x={23} y={25} />
        </g>
      );
    case 'snow':
      return (
        <g>
          <Cloud scale={0.92} cx={16} cy={14.5} />
          <Snowflake x={9} y={24.5} />
          <Snowflake x={16} y={25.5} />
          <Snowflake x={23} y={24.5} />
        </g>
      );
    case 'thunderstorm':
      return (
        <g>
          <Cloud scale={0.92} cx={16} cy={14} />
          <Bolt x={16} y={23} />
        </g>
      );
    case 'hail':
      return (
        <g>
          <Cloud scale={0.92} cx={16} cy={14} />
          <Bolt x={13} y={23} />
          <circle cx={22} cy={24} r={2.1} fill="currentColor" />
          <circle cx={25.5} cy={28.5} r={1.6} fill="currentColor" />
        </g>
      );
  }
}

function Sun() {
  return (
    <g>
      <circle cx="16" cy="13" r="5.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <line x1="16" y1="2.8" x2="16" y2="5.8" />
        <line x1="16" y1="20.2" x2="16" y2="23.2" />
        <line x1="5.8" y1="13" x2="8.8" y2="13" />
        <line x1="23.2" y1="13" x2="26.2" y2="13" />
        <line x1="8.8" y1="5.8" x2="10.9" y2="7.9" />
        <line x1="21.1" y1="18.1" x2="23.2" y2="20.2" />
        <line x1="23.2" y1="5.8" x2="21.1" y2="7.9" />
        <line x1="10.9" y1="18.1" x2="8.8" y2="20.2" />
      </g>
    </g>
  );
}

function Moon() {
  return (
    <path
      d="M22.4 17.8A7.8 7.8 0 0 1 13.2 8.6a7.8 7.8 0 1 0 9.2 9.2Z"
      fill="currentColor"
    />
  );
}

function Cloud({
  scale = 1,
  cx = CLOUD_CENTER.x,
  cy = CLOUD_CENTER.y,
  opacity,
}: {
  scale?: number;
  cx?: number;
  cy?: number;
  opacity?: number;
}) {
  // 讓縮放以雲朵自身為中心，而不是以 SVG 原點為中心。
  const tx = cx - CLOUD_CENTER.x * scale;
  const ty = cy - CLOUD_CENTER.y * scale;
  return (
    <path
      d={CLOUD_PATH}
      fill="currentColor"
      opacity={opacity}
      transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale})`}
    />
  );
}

function RainLines({ length }: { length: number }) {
  return (
    <g stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <line x1="10" y1="21" x2="8.4" y2={21 + length} />
      <line x1="16" y1="21" x2="14.4" y2={21 + length} />
      <line x1="22" y1="21" x2="20.4" y2={21 + length} />
    </g>
  );
}

function Snowflake({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <line x1={x - 2.4} y1={y} x2={x + 2.4} y2={y} />
      <line x1={x - 1.2} y1={y - 2.1} x2={x + 1.2} y2={y + 2.1} />
      <line x1={x - 1.2} y1={y + 2.1} x2={x + 1.2} y2={y - 2.1} />
    </g>
  );
}

function FogLines() {
  return (
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity={0.85}>
      <line x1="8" y1="24" x2="24" y2="24" />
      <line x1="10" y1="27.5" x2="22" y2="27.5" />
    </g>
  );
}

function Bolt({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={BOLT_PATH}
      fill="currentColor"
      transform={`translate(${(x - 17).toFixed(2)} ${(y - 23).toFixed(2)})`}
    />
  );
}
