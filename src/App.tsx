import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import CampaignListPage from "./pages/CampaignListPage";
import NewCampaignPage from "./pages/NewCampaignPage";
import Step1AssetsPage from "./pages/Step1AssetsPage";
import Step2ConsultPage from "./pages/Step2ConsultPage";
import Step3GeneratingPage from "./pages/Step3GeneratingPage";
import Step4ResultsPage from "./pages/Step4ResultsPage";
import VideoDetailPage from "./pages/VideoDetailPage";
import NotFoundPage from "./pages/NotFoundPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/campaigns" replace />} />
      <Route element={<AppShell />}>
        <Route path="/campaigns" element={<CampaignListPage />} />
        <Route path="/campaigns/new" element={<NewCampaignPage />} />
        <Route path="/campaigns/:id/step/1" element={<Step1AssetsPage />} />
        <Route path="/campaigns/:id/step/2" element={<Step2ConsultPage />} />
        <Route path="/campaigns/:id/step/3" element={<Step3GeneratingPage />} />
        <Route path="/campaigns/:id/step/4" element={<Step4ResultsPage />} />
        <Route path="/videos/:videoId" element={<VideoDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default App;