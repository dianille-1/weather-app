import { usePreferences } from '../app/preferences';
import { UnitToggle } from '../components/common/UnitToggle';
import styles from './SettingsPage.module.css';

/**
 * 設定頁（路由 `/settings`）。
 *
 * 這個頁面的存在有兩個目的：
 *   1. 使用者實際需要的地方（單位、最近瀏覽管理、資料來源說明）
 *   2. 示範「新增頁面」的成本有多低 —— 這個檔案完全不知道天氣頁的存在，
 *      天氣頁也不需要因為多了這個頁面而改任何一行。
 */
export function SettingsPage() {
  const {
    units,
    toggleTemperatureUnit,
    recentLocations,
    removeRecentLocation,
    clearRecentLocations,
  } = usePreferences();

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h2 className={styles.title}>設定</h2>
        <p className={styles.subtitle}>偏好會保存在這個瀏覽器，下次開啟仍然有效。</p>
      </div>

      <section className={styles.card} aria-labelledby="settings-units">
        <h3 className={styles.cardTitle} id="settings-units">
          溫度與風速單位
        </h3>
        <p className={styles.text}>
          切換溫度單位時，風速單位會一併切換（°C 對應 km/h、°F 對應 mph），
          因為這是同一組「公制 / 英制」偏好。
        </p>
        <div className={styles.unitControl}>
          <UnitToggle units={units} onChange={() => toggleTemperatureUnit()} />
        </div>
      </section>

      <section className={styles.card} aria-labelledby="settings-recent">
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle} id="settings-recent">
            最近瀏覽
          </h3>
          {recentLocations.length > 0 ? (
            <button
              type="button"
              className={styles.textButton}
              onClick={clearRecentLocations}
            >
              清除全部
            </button>
          ) : null}
        </div>

        {recentLocations.length === 0 ? (
          <p className={styles.text}>還沒有瀏覽紀錄。</p>
        ) : (
          <ul className={styles.recentList}>
            {recentLocations.map((location) => (
              <li key={location.id} className={styles.recentItem}>
                <span className={styles.recentName}>
                  {location.name}
                  {location.country ? (
                    <span className={styles.recentMeta}> · {location.country}</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => removeRecentLocation(location.id)}
                  aria-label={`移除 ${location.name}`}
                >
                  移除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.card} aria-labelledby="settings-sources">
        <h3 className={styles.cardTitle} id="settings-sources">
          資料來源
        </h3>
        <ul className={styles.sourceList}>
          <li className={styles.source}>
            <p className={styles.sourceName}>
              天氣預報：<a href="https://open-meteo.com/en/docs" target="_blank" rel="noreferrer">Open-Meteo</a>
            </p>
            <p className={styles.text}>免註冊、免 API key，提供即時觀測與 7 天預報。</p>
          </li>
          <li className={styles.source}>
            <p className={styles.sourceName}>
              地名搜尋：<a href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noreferrer">Open-Meteo Geocoding</a>
              {' + '}
              <a href="https://nominatim.org" target="_blank" rel="noreferrer">OSM Nominatim</a>
            </p>
            <p className={styles.text}>
              兩個來源都免註冊。Open-Meteo 的中文地名索引對台灣等地收錄不全，
              因此查無結果時會自動改用 Nominatim 與其他寫法再試一次。
            </p>
          </li>
        </ul>
      </section>

      <section className={styles.card} aria-labelledby="settings-shortcuts">
        <h3 className={styles.cardTitle} id="settings-shortcuts">
          鍵盤操作
        </h3>
        <ul className={styles.shortcuts}>
          <li>
            <kbd>↑</kbd> <kbd>↓</kbd> 在搜尋結果中移動
          </li>
          <li>
            <kbd>Enter</kbd> 選取目前項目
          </li>
          <li>
            <kbd>Esc</kbd> 清除搜尋內容
          </li>
        </ul>
      </section>
    </div>
  );
}
