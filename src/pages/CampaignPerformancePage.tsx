import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fakeApi } from "../api/fakeApi";
import type { Campaign, CampaignPerformance } from "../types";
import PageLayout from "../components/PageLayout";
import FlowFooter from "../components/FlowFooter";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";

type PerformancePaneKey = "overview" | "trend" | "channels";

const formatInteger = (value: number): string => value.toLocaleString();
const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;
const formatCurrency = (value: number): string =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const CampaignPerformancePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [performance, setPerformance] = useState<CampaignPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<PerformancePaneKey, boolean>>({
    overview: true,
    trend: true,
    channels: true,
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let active = true;
    Promise.all([fakeApi.getCampaign(id), fakeApi.getCampaignPerformance(id)])
      .then(([campaignData, performanceData]) => {
        if (!active) {
          return;
        }
        setCampaign(campaignData);
        setPerformance(performanceData);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  const isAllExpanded = useMemo(
    () => Object.values(expandedItems).every(Boolean),
    [expandedItems]
  );

  const trendChartData = useMemo(
    () =>
      (performance?.series ?? []).map((point) => ({
        ...point,
        impressionsLabel: formatInteger(point.impressions),
      })),
    [performance]
  );
  const maxChannelSpend = useMemo(
    () => Math.max(...(performance?.channels.map((channel) => channel.spend) ?? [1])),
    [performance]
  );

  const onToggleAll = () => {
    const nextOpen = !isAllExpanded;
    setExpandedItems({
      overview: nextOpen,
      trend: nextOpen,
      channels: nextOpen,
    });
  };

  const onTogglePane = (key: PerformancePaneKey, open: boolean) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: open,
    }));
  };

  if (loading) {
    return (
      <PageLayout title="Campaign Performance">
        <div className="row">
          <LoadingSpinner />
          <span>Loading performance details...</span>
        </div>
      </PageLayout>
    );
  }

  if (!campaign || !performance) {
    return (
      <PageLayout title="Campaign Performance">
        <Card>
          <p>Campaign performance not found.</p>
          <Link to="/performance">Back to performance</Link>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={`Performance: ${campaign.name}`}
      subtitle="Detailed campaign trends and channel breakdown from backend dummy metrics."
      bodyClassName="stack flow-page-body approvals-page-body"
    >
      <div className="approvals-toolbar-wrap">
        <div className="card approvals-toolbar">
          <div className="row row-between row-wrap">
            <div className="stack-sm">
              <strong>{campaign.name}</strong>
              <span className="muted">Campaign ID: {campaign.id}</span>
              <span className="muted">
                Last refreshed: {new Date(performance.generatedAt).toLocaleString()}
              </span>
            </div>
            <Button type="button" variant="ghost" onClick={onToggleAll}>
              {isAllExpanded ? "Collapse all" : "Expand all"}
            </Button>
          </div>
        </div>
      </div>
      <div className="approvals-list">
        <details
          className="approvals-pane"
          open={expandedItems.overview}
          onToggle={(event) =>
            onTogglePane("overview", (event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary className="approvals-pane-summary">
            <div className="approvals-pane-head">
              <strong>Overview</strong>
              <span className="approvals-pane-caret" aria-hidden="true" />
            </div>
          </summary>
          <div className="approvals-pane-body">
            <div className="performance-summary-grid">
              <div className="performance-summary-tile">
                <span className="muted">Impressions</span>
                <strong>{formatInteger(performance.totals.impressions)}</strong>
              </div>
              <div className="performance-summary-tile">
                <span className="muted">Clicks</span>
                <strong>{formatInteger(performance.totals.clicks)}</strong>
              </div>
              <div className="performance-summary-tile">
                <span className="muted">Conversions</span>
                <strong>{formatInteger(performance.totals.conversions)}</strong>
              </div>
              <div className="performance-summary-tile">
                <span className="muted">CTR</span>
                <strong>{formatPercent(performance.totals.ctr)}</strong>
              </div>
              <div className="performance-summary-tile">
                <span className="muted">Conversion Rate</span>
                <strong>{formatPercent(performance.totals.conversionRate)}</strong>
              </div>
              <div className="performance-summary-tile">
                <span className="muted">ROAS</span>
                <strong>{performance.totals.roas.toFixed(2)}x</strong>
              </div>
              <div className="performance-summary-tile">
                <span className="muted">Spend</span>
                <strong>{formatCurrency(performance.totals.spend)}</strong>
              </div>
              <div className="performance-summary-tile">
                <span className="muted">Revenue</span>
                <strong>{formatCurrency(performance.totals.revenue)}</strong>
              </div>
            </div>
          </div>
        </details>
        <details
          className="approvals-pane"
          open={expandedItems.trend}
          onToggle={(event) => onTogglePane("trend", (event.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="approvals-pane-summary">
            <div className="approvals-pane-head">
              <strong>7-Day Trend</strong>
              <span className="approvals-pane-caret" aria-hidden="true" />
            </div>
          </summary>
          <div className="approvals-pane-body">
            <div className="performance-line-chart-wrap">
              <div className="performance-line-chart">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendChartData} margin={{ top: 12, right: 10, left: 6, bottom: 2 }}>
                    <defs>
                      <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5a8ef0" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#5a8ef0" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#dbe4f5" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#43506c" }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#43506c" }}
                      tickFormatter={(value: number) => formatInteger(value)}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value) => [
                        `${formatInteger(Number(value ?? 0))} impressions`,
                        "Impressions",
                      ]}
                      labelFormatter={(label) => `${label}`}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #d8deea",
                        boxShadow: "0 8px 24px rgba(18, 36, 70, 0.12)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="impressions"
                      stroke="#5a8ef0"
                      fill="url(#trendAreaFill)"
                      strokeWidth={0}
                    />
                    <Line
                      type="monotone"
                      dataKey="impressions"
                      stroke="#2b61c8"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#5a8ef0", stroke: "#ffffff", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#2b61c8", stroke: "#ffffff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="performance-line-chart-labels">
                {performance.series.map((point) => (
                  <div key={point.label} className="performance-line-chart-label-item">
                    <strong>{point.label}</strong>
                    <span className="muted">{formatInteger(point.impressions)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
        <details
          className="approvals-pane"
          open={expandedItems.channels}
          onToggle={(event) =>
            onTogglePane("channels", (event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary className="approvals-pane-summary">
            <div className="approvals-pane-head">
              <strong>Channel Breakdown</strong>
              <span className="approvals-pane-caret" aria-hidden="true" />
            </div>
          </summary>
          <div className="approvals-pane-body">
            <div className="performance-chart">
              {performance.channels.map((channel) => (
                <div key={channel.label} className="performance-chart-row">
                  <span className="performance-chart-label">{channel.label}</span>
                  <div className="performance-chart-track">
                    <div
                      className="performance-chart-fill performance-chart-fill-channel"
                      style={{ width: `${Math.max((channel.spend / maxChannelSpend) * 100, 3)}%` }}
                    />
                  </div>
                  <span className="performance-chart-value">
                    {formatCurrency(channel.spend)} spend
                  </span>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>
      <FlowFooter>
        <div className="flow-footer-actions">
          <Button type="button" variant="secondary" onClick={() => navigate("/performance")}>
            Back
          </Button>
        </div>
      </FlowFooter>
    </PageLayout>
  );
};

export default CampaignPerformancePage;
