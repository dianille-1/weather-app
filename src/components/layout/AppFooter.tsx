import { useDataSources } from '../../app/dataSources';
import styles from './AppFooter.module.css';

/** 頁尾：標示資料來源，避免使用者誤以為資料來自官方氣象局。 */
export function AppFooter() {
  const { weatherProvider, geocoder } = useDataSources();

  return (
    <footer className={styles.footer}>
      天氣資料：{weatherProvider.displayName} · 地名搜尋：{geocoder.displayName} · 前端技術作業成果
    </footer>
  );
}
