import horizon from '@horizon/client';
import { createRoot } from 'react-dom/client';
import App from './components/App.js';
import './base.css';

const hz = horizon({
  secure: false
});

hz.connect();

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App hz={hz} />);
}
