import horizon from '@horizon/client';
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App.jsx';

const hz = horizon({
  secure: false
});

hz.connect();

ReactDOM.render(<App hz={hz} />, document.getElementById('root'));
