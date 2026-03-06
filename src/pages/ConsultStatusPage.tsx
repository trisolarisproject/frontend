import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign } from "../types";
import { useInterval } from "../hooks/useInterval";
import Banner from "../components/ui/Banner";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import ProgressBar from "../components/ui/ProgressBar";
import PageLayout from "../components/PageLayout";

const formatRuntime = (startedAt: string, endedAt: string) => {
  const ms = Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime());
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

const ConsultStatusPage = () => {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [videos, setVideos] = useState<{ id: string; title: string; caption: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPanels, setOpenPanels] = useState({
    consult: true,
    research: false,
    posting: false,
  });
  const startingNextTaskRef = useRef(false);

  const maybeStartNextTask = async (current: Campaign) => {
    if (!id || startingNextTaskRef.current) {
      return;
    }
    const flowStep = current.journey?.flowStep ?? 1;
    const phase = current.journey?.phase;
    const activeTask = current.journey?.activeTask;

    if (flowStep === 3 && activeTask !== "research") {
      startingNextTaskRef.current = true;
      try {
        const next = await fakeApi.startFlowStep3Research(id);
        setCampaign(next);
      } finally {
        startingNextTaskRef.current = false;
      }
      return;
    }

    if (flowStep === 4 && phase !== "complete" && activeTask !== "posting") {
      startingNextTaskRef.current = true;
      try {
        const next = await fakeApi.startFlowStep4Posting(id);
        setCampaign(next);
      } finally {
        startingNextTaskRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (!id) {
      return;
    }
    fakeApi
      .getCampaign(id)
      .then(async (campaignData) => {
        setCampaign(campaignData);
        if (campaignData) {
          await maybeStartNextTask(campaignData);
          if (campaignData.journey?.phase === "complete") {
            const loadedVideos = await fakeApi.listVideos(id);
            setVideos(loadedVideos.map((video) => ({ id: video.id, title: video.title, caption: video.caption })));
          }
        }
      })
      .catch(() => setError("Unable to load consult status."))
      .finally(() => setLoading(false));
  }, [id]);

  useInterval(() => {
    if (!id) {
      return;
    }
    void fakeApi.pollFlowStep(id)
      .then(async (next) => {
        if (!next) {
          return;
        }
        setCampaign(next);
        await maybeStartNextTask(next);
        if (next.journey?.phase === "complete") {
          const loadedVideos = await fakeApi.listVideos(id);
          setVideos(loadedVideos.map((video) => ({ id: video.id, title: video.title, caption: video.caption })));
        }
      })
      .catch(() => setError("Unable to refresh build log."));
  }, campaign && campaign.journey?.phase !== "complete" ? 700 : null);

  const currentFlowStep = campaign?.journey?.flowStep ?? 1;
  const currentPhase = campaign?.journey?.phase;
  const currentActiveTask = campaign?.journey?.activeTask;
  const currentTaskProgress = campaign?.journey?.taskProgress ?? 0;
  const consultProgressForCollapse =
    currentActiveTask === "consult" ? currentTaskProgress : currentFlowStep > 2 ? 100 : 0;
  const researchProgressForCollapse =
    currentActiveTask === "research" ? currentTaskProgress : currentFlowStep > 3 ? 100 : 0;
  const postingProgressForCollapse =
    currentActiveTask === "posting" ? currentTaskProgress : currentPhase === "complete" ? 100 : 0;

  useEffect(() => {
    setOpenPanels((prev) => {
      const next = {
        consult: consultProgressForCollapse >= 100 ? false : prev.consult,
        research: researchProgressForCollapse >= 100 ? false : prev.research,
        posting: postingProgressForCollapse >= 100 ? false : prev.posting,
      };
      if (
        next.consult === prev.consult &&
        next.research === prev.research &&
        next.posting === prev.posting
      ) {
        return prev;
      }
      return next;
    });
  }, [consultProgressForCollapse, researchProgressForCollapse, postingProgressForCollapse]);

  if (loading) {
    return (
      <PageLayout
        title="Campaign Build Log"
        subtitle="All AI pipeline stages are tracked here in one place."
      >
        <div className="row">
          <LoadingSpinner />
          <span>Loading build log...</span>
        </div>
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <Card>
        <p>Campaign not found.</p>
        <Link to="/campaigns">Back to campaigns</Link>
      </Card>
    );
  }

  const flowStep = campaign.journey?.flowStep ?? 1;
  if (flowStep < 2) {
    return (
      <Card>
        <p>Complete Upload Assets first.</p>
        <Link to={`/campaigns/${campaign.id}/flow/upload-assets`}>Go to upload assets</Link>
      </Card>
    );
  }

  const phase = campaign.journey?.phase;
  const activeTask = campaign.journey?.activeTask;
  const taskProgress = campaign.journey?.taskProgress ?? 0;

  const consultProgress = activeTask === "consult" ? taskProgress : flowStep > 2 ? 100 : 0;
  const researchProgress = activeTask === "research" ? taskProgress : flowStep > 3 ? 100 : 0;
  const postingProgress = activeTask === "posting" ? taskProgress : phase === "complete" ? 100 : 0;

  const consultStatus = consultProgress >= 100 ? "done" : activeTask === "consult" ? "running" : "pending";
  const researchStatus = researchProgress >= 100 ? "done" : activeTask === "research" ? "running" : "pending";
  const postingStatus = postingProgress >= 100 ? "done" : activeTask === "posting" ? "running" : "pending";
  const isCompleted = phase === "complete";
  const runtime = isCompleted
    ? formatRuntime(campaign.createdAt, campaign.journey?.updatedAt ?? new Date().toISOString())
    : null;
  const completedActions = [
    "Instagram",
    "TikTok",
    "X",
  ];

  let activePane: "consult" | "research" | "posting" = "consult";
  if (activeTask === "research" || flowStep >= 3) {
    activePane = "research";
  }
  if (activeTask === "posting" || flowStep >= 4 || phase === "complete") {
    activePane = "posting";
  }

  const togglePanel = (panel: "consult" | "research" | "posting") => {
    setOpenPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
  };

  const isConsultOpen = openPanels.consult || (activePane === "consult" && consultProgress < 100);
  const isResearchOpen = openPanels.research || (activePane === "research" && researchProgress < 100);
  const isPostingOpen = openPanels.posting || (activePane === "posting" && postingProgress < 100);

  return (
    <PageLayout
      title="Campaign Build Log"
      subtitle="All AI pipeline stages are tracked here in one place."
    >
      {error ? <Banner kind="error">{error}</Banner> : null}
      <Card>
        <div className="build-log">
          <section className="build-step">
            <button type="button" className="build-step-head" onClick={() => togglePanel("consult")}>
              <span className={`build-step-icon build-step-${consultStatus}`}>{consultStatus === "done" ? "✓" : "•"}</span>
              <span className="build-step-title">Agentic consult</span>
              <span className="build-step-meta">{consultProgress}%</span>
            </button>
            {isConsultOpen ? (
              <div className="build-step-body">
                <p className="muted">
                  {activeTask === "consult"
                    ? campaign.journey?.taskStatusMessage ?? "Analyzing consult inputs..."
                    : consultProgress >= 100
                    ? "Consult complete."
                    : "Waiting for chat kickoff."}
                </p>
                <ProgressBar value={consultProgress} />
              </div>
            ) : null}
          </section>

          <section className="build-step">
            <button type="button" className="build-step-head" onClick={() => togglePanel("research")}>
              <span className={`build-step-icon build-step-${researchStatus}`}>{researchStatus === "done" ? "✓" : "•"}</span>
              <span className="build-step-title">AI research</span>
              <span className="build-step-meta">{researchProgress}%</span>
            </button>
            {isResearchOpen ? (
              <div className="build-step-body">
                <p className="muted">
                  {activeTask === "research"
                    ? campaign.journey?.taskStatusMessage ?? "Research in progress..."
                    : researchProgress >= 100
                    ? "Research complete."
                    : "Starts automatically after consult."}
                </p>
                <ProgressBar value={researchProgress} />
                {campaign.journey?.researchSummary.length ? (
                  <ul className="list">
                    {campaign.journey.researchSummary.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="build-step">
            <button type="button" className="build-step-head" onClick={() => togglePanel("posting")}>
              <span className={`build-step-icon build-step-${postingStatus}`}>{postingStatus === "done" ? "✓" : "•"}</span>
              <span className="build-step-title">Asset posting</span>
              <span className="build-step-meta">{postingProgress}%</span>
            </button>
            {isPostingOpen ? (
              <div className="build-step-body">
                <p className="muted">
                  {activeTask === "posting"
                    ? campaign.journey?.taskStatusMessage ?? "Posting in progress..."
                    : postingProgress >= 100
                    ? "Posting complete. Assets are live."
                    : "Starts automatically after research."}
                </p>
                <ProgressBar value={postingProgress} />
                {phase === "complete" ? (
                  <p className="muted">Generated {videos.length} short-form videos.</p>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      </Card>

      {isCompleted ? (
        <Card>
          <div className="campaign-summary">
            <div className="campaign-summary-head">
              <div className="stack-sm">
                <h2>Campaign Summary</h2>
                <p className="muted">Campaign flow completed. The agent is now monitoring performance.</p>
              </div>
              <div className="campaign-summary-actions">
                <span className="badge badge-success">Monitoring</span>
              </div>
            </div>

            <div className="summary-kpis">
              <div className="summary-kpi">
                <span className="muted">Status</span>
                <strong>Complete</strong>
              </div>
              <div className="summary-kpi">
                <span className="muted">Run Time</span>
                <strong>{runtime ?? "n/a"}</strong>
              </div>
              <div className="summary-kpi">
                <span className="muted">Assets</span>
                <strong>{videos.length}</strong>
              </div>
              <div className="summary-kpi">
                <span className="muted">Agent</span>
                <strong>Monitoring</strong>
              </div>
            </div>

            <div className="campaign-summary-grid">
              <section className="campaign-summary-tile">
                <h3>Platforms</h3>
                <ul className="list">
                  {completedActions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="campaign-summary-tile">
                <div className="campaign-summary-tile-head">
                  <h3>Assets</h3>
                  <Link className="summary-link" to={`/campaigns/${campaign.id}/assets?campaignId=${campaign.id}`}>
                    Details
                  </Link>
                </div>
                {videos.length > 0 ? (
                  <div className="stack-sm">
                    {videos.slice(0, 3).map((video) => (
                      <Link key={video.id} to={`/videos/${video.id}`}>
                        {video.title}
                      </Link>
                    ))}
                    {videos.length > 3 ? <p className="muted">+{videos.length - 3} more assets</p> : null}
                  </div>
                ) : (
                  <p className="muted">Assets are being indexed.</p>
                )}
              </section>

              <section className="campaign-summary-tile">
                <div className="campaign-summary-tile-head">
                  <h3>Metrics</h3>
                  <Link className="summary-link" to="/campaigns">
                    Details
                  </Link>
                </div>
                <div className="metric-row">
                  <span className="muted">Impressions</span>
                  <strong>{campaign.journey?.metrics?.impressions ?? "Pending"}</strong>
                </div>
                <div className="metric-row">
                  <span className="muted">Clicks</span>
                  <strong>{campaign.journey?.metrics?.clicks ?? "Pending"}</strong>
                </div>
                <div className="metric-row">
                  <span className="muted">Sales</span>
                  <strong>{campaign.journey?.metrics?.sales ?? "Pending"}</strong>
                </div>
              </section>

              <section className="campaign-summary-tile">
                <h3>Agent Status</h3>
                <div className="metric-row">
                  <span className="muted">Status</span>
                  <strong>Monitoring</strong>
                </div>
                <div className="metric-row">
                  <span className="muted">Run Time</span>
                  <strong>{runtime ?? "n/a"}</strong>
                </div>
              </section>
            </div>
          </div>
        </Card>
      ) : null}
    </PageLayout>
  );
};

export default ConsultStatusPage;
