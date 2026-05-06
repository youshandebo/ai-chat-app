import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Changelog from "./pages/Changelog";
import Store from "./pages/Store";
import Sponsor from "./pages/Sponsor";
import Admin from "./pages/Admin";
import Articles from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";

import NotFound from "./pages/NotFound";

export default function App() {
  React.useEffect(() => {
    // @ts-ignore
    const apiBase = import.meta.env.VITE_BACKEND_BASE || '';
    fetch(`${apiBase}/api/settings/theme`)
      .then(r => r.json())
      .then(data => {
        if (data.theme === 'new-year') {
          document.documentElement.classList.add('theme-newyear');
        } else {
          document.documentElement.classList.remove('theme-newyear');
        }
      })
      .catch(console.error);
  }, []);

  return (
    <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<Chat />} />

            <Route path="/changelog" element={<Changelog />} />
            <Route path="/store" element={<Store />} />
            <Route path="/sponsor" element={<Sponsor />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/:id" element={<ArticleDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </HelmetProvider>
  );
}