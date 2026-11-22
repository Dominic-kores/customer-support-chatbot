
import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import ChatPage from "./pages/ChatPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer support page */}
        <Route path="/" element={<ChatPage />} />

        {/* FAQ administration page */}
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}
