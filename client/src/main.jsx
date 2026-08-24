import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ChatProvider } from "./context/ChatContext.jsx";
import { FriendshipProvider } from "./context/FriendshipContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename="/messaging-app">
      <AuthProvider>
        <SocketProvider>
          <FriendshipProvider>
            <ChatProvider>
              <App />
            </ChatProvider>
          </FriendshipProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
