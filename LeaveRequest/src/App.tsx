import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import Home from './Home';
import LeaveRequestForm from './LeaveRequestForm';

const App: React.FC = () => {
  return (
    <Router>
      <Route path="/new">
        <LeaveRequestForm />
      </Route>
      <Route path="/">
        <Home />
      </Route>
    </Router>
  );
};

export default App;