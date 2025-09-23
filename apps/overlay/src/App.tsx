import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import OverlayMain from './routes/OverlayMain';
import OverlayChecklist from './routes/OverlayChecklist';
import OverlayNet from './routes/OverlayNet';
import OverlayAI from './routes/OverlayAI';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/overlays/main" element={<OverlayMain />} />
        <Route path="/overlays/checklist" element={<OverlayChecklist />} />
        <Route path="/overlays/net" element={<OverlayNet />} />
        <Route path="/overlays/ai" element={<OverlayAI />} />
        <Route path="*" element={<OverlayMain />} /> {/* default */}
      </Routes>
    </Router>
  );
}

export default App;