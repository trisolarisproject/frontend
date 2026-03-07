import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import CampaignListPage from "./pages/CampaignListPage";
import NewCampaignPage from "./pages/NewCampaignPage";
import VideoDetailPage from "./pages/VideoDetailPage";
import NotFoundPage from "./pages/NotFoundPage";
import SidebarPlaceholderPage from "./pages/SidebarPlaceholderPage";
import AssetIntakePage from "./pages/AssetIntakePage";
import CampaignDetailsPage from "./pages/CampaignDetailsPage";
import ConsultChatPage from "./pages/ConsultChatPage";
import ConsultStatusPage from "./pages/ConsultStatusPage";
import CampaignAssetsPage from "./pages/CampaignAssetsPage";
import FlowLayout from "./components/FlowLayout";
import ApprovalsPage from "./pages/ApprovalsPage";
import CampaignApprovalsPage from "./pages/CampaignApprovalsPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/campaigns" replace />} />
      <Route element={<AppShell />}>
        <Route path="/campaigns" element={<CampaignListPage />} />
        <Route path="/campaigns/new" element={<NewCampaignPage />} />
        <Route path="/campaign-assets" element={<CampaignAssetsPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/campaigns/:id/approvals" element={<CampaignApprovalsPage />} />
        <Route path="/campaigns/:id/assets" element={<CampaignAssetsPage />} />
        <Route path="/campaigns/:id/flow" element={<FlowLayout />}>
          <Route path="upload-assets" element={<AssetIntakePage />} />
          <Route path="campaign-details" element={<CampaignDetailsPage />} />
          <Route path="consult-chat" element={<ConsultChatPage />} />
          <Route path="consult-status" element={<ConsultStatusPage />} />
          <Route path="research" element={<ConsultStatusPage />} />
          <Route path="asset-posting" element={<ConsultStatusPage />} />
        </Route>
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
