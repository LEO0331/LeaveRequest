import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1f6feb'
    },
    secondary: {
      main: '#1f883d'
    },
    background: {
      default: '#f6f8fa'
    }
  },
  shape: {
    borderRadius: 10
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
