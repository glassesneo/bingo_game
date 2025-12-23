import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { HostPage } from "./pages/HostPage";
import { JoinPage } from "./pages/JoinPage";
import { PlayerPage } from "./pages/PlayerPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/host/:hostToken" element={<HostPage />} />
        <Route path="/join/:inviteToken" element={<JoinPage />} />
        <Route path="/play/:gameId" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
