import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { store } from './reduxStoreAndSlices/store';
import LocalApp from './components/LocalApp/LocalApp';
import './i18n/config';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <Provider store={store}>
        <BrowserRouter>
          <LocalApp />
        </BrowserRouter>
      </Provider>
    </HelmetProvider>
  </React.StrictMode>
);