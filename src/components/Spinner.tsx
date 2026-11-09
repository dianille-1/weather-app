import styles from './Spinner.module.css';

interface Props {
  size?: number;
  className?: string;
}

/** 純 CSS 的載入指示器。 */
export function Spinner({ size = 18, className }: Props) {
  const classes = className ? `${styles.spinner} ${className}` : styles.spinner;
  return (
    <span
      className={classes}
      style={{ width: size, height: size }}
      role="status"
      aria-label="載入中"
    />
  );
}
