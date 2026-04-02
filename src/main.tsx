import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';
import './design.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#df5a3d'
    },
    secondary: {
      main: '#1f4b5a'
    },
    background: {
      default: '#f4efe6',
      paper: '#fff9ef'
    },
    text: {
      primary: '#111827',
      secondary: '#334155'
    }
  },
  shape: {
    borderRadius: 14
  },
  typography: {
    fontFamily: `'Plus Jakarta Sans', 'Segoe UI', sans-serif`,
    h1: {
      fontFamily: `'Fraunces', Georgia, serif`
    },
    h2: {
      fontFamily: `'Fraunces', Georgia, serif`
    },
    h3: {
      fontFamily: `'Fraunces', Georgia, serif`
    },
    h4: {
      fontFamily: `'Fraunces', Georgia, serif`
    },
    h5: {
      fontFamily: `'Fraunces', Georgia, serif`
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 999
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18
        }
      }
    }
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
