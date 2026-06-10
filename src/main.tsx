import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { store } from './reduxStoreAndSlices/store';
import LocalApp from './components/LocalApp/LocalApp';
import './i18n/config';
import '@silevis/reactgrid/styles.css';
import 'quill/dist/quill.snow.css';
import './index.css';

// 単一HTMLビルドは file:// で開くため、サーバー前提の BrowserRouter ではなく
// HashRouter を使う（basename も不要）。
const isSingleFile = import.meta.env.MODE === 'singlefile';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      {isSingleFile ? (
        <HashRouter>
          <LocalApp />
        </HashRouter>
      ) : (
        <BrowserRouter basename="/ganttapp-local">
          <LocalApp />
        </BrowserRouter>
      )}
    </Provider>
  </React.StrictMode>
);