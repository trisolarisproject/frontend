import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import CampaignListPage from "./pages/CampaignListPage";
import NewCampaignPage from "./pages/NewCampaignPage";
import VideoDetailPage from "./pages/VideoDetailPage";
import NotFoundPage from "./pages/NotFoundPage";
import SidebarPlaceholderPage from "./pages/SidebarPlaceholderPage";
import AssetIntakePage from "./pages/AssetIntakePage";
import ConsultIntakePage from "./pages/ConsultIntakePage";
import ConsultChatPage from "./pages/ConsultChatPage";
import ConsultStatusPage from "./pages/ConsultStatusPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/campaigns" replace />} />
      <Route element={<AppShell />}>
        <Route path="/campaigns" element={<CampaignListPage />} />
        <Route path="/campaigns/new" element={<NewCampaignPage />} />
        <Route path="/campaigns/:id/flow/asset-intake" element={<AssetIntakePage />} />
        <Route path="/campaigns/:id/flow/consult-intake" element={<ConsultIntakePage />} />
        <Route path="/campaigns/:id/flow/consult-chat" element={<ConsultChatPage />} />
        <Route path="/campaigns/:id/flow/consult-status" element={<ConsultStatusPage />} />
        <Route path="/campaigns/:id/flow/research" element={<ConsultStatusPage />} />
        <Route path="/campaigns/:id/flow/asset-posting" element={<ConsultStatusPage />} />
        <Route path="/summary" element={<SidebarPlaceholderPage />} />
        <Route path="/performance" element={<SidebarPlaceholderPage />} />
        <Route path="/audiences" element={<SidebarPlaceholderPage />} />
        <Route path="/creative-library" element={<SidebarPlaceholderPage />} />
        <Route path="/videos/:videoId" element={<VideoDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default App;
