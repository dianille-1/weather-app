import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('找不到 #root 容器，請確認 index.html 是否有正確設定。');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
