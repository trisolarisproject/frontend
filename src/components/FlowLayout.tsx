import { Outlet, useLocation } from "react-router-dom";
import Stepper from "./Stepper";

interface FlowHeaderConfig {
  title: string;
  subtitle: string;
  step: 1 | 2 | 3 | 4;
  completedSteps: 1 | 2 | 3 | 4;
}

const getFlowHeaderConfig = (pathname: string): FlowHeaderConfig => {
  if (pathname.endsWith("/upload-assets")) {
    return {
      title: "Upload Assets",
      subtitle: "Upload assets and provide product context.",
      step: 2,
      completedSteps: 2,
    };
  }

  if (pathname.endsWith("/campaign-details")) {
    return {
      title: "Campaign Details",
      subtitle: "Provide initial inputs before reviewing AI clarifying questions.",
      step: 3,
      completedSteps: 3,
    };
  }

  if (pathname.endsWith("/consult-chat")) {
    return {
      title: "AI Consult",
      subtitle: "Edit and save each answer, then submit all answers to start the build.",
      step: 4,
      completedSteps: 3,
    };
  }

  return {
    title: "Campaign Build Log",
    subtitle: "All AI pipeline stages are tracked here in one place.",
    step: 4,
    completedSteps: 4,
  };
};

const FlowLayout = () => {
  const { pathname } = useLocation();
  const header = getFlowHeaderConfig(pathname);

  return (
    <div className="page-layout">
      <header className="page-header-bar">
        <div className="page-header-inner">
          <div className="page-header-main page-header-main-with-side">
            <div className="page-header-text">
              <h1>{header.title}</h1>
              <p className="muted">{header.subtitle}</p>
            </div>
            <div className="page-header-side">
              <Stepper currentStep={header.step} completedSteps={header.completedSteps} />
            </div>
          </div>
        </div>
      </header>
      <div className="page-body">
        <div className="page-body-inner stack flow-page-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default FlowLayout;
