import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./providers/auth";
import { App } from "./App";
import { BASE_PATH } from "@/shared/config";
import "./styles/index.scss";

const root = document.getElementById("root");
if (!root) throw new Error("Не найден #root в index.html");

/* basename нужен для GitHub Pages (/georazum/); пустая строка — корень (dev). */
const basename = BASE_PATH || undefined;

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
