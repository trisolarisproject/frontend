import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign, CampaignPerformance } from "../types";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageLayout from "../components/PageLayout";

const formatInteger = (value: number): string => value.toLocaleString();
const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;
const formatCurrency = (value: number): string =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const PerformancePage = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [performanceByCampaignId, setPerformanceByCampaignId] = useState<
    Record<string, CampaignPerformance>
  >({});
  const [loadingPerformanceIds, setLoadingPerformanceIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    fakeApi
      .listCampaigns()
      .then((campaignList) => {
        if (!active) {
          return;
        }
        setCampaigns(campaignList);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (campaigns.length === 0) {
      return;
    }

    let active = true;
    campaigns.forEach((campaign) => {
      setLoadingPerformanceIds((prev) => ({ ...prev, [campaign.id]: true }));
      fakeApi
        .getCampaignPerformance(campaign.id)
        .then((performance) => {
          if (!active) {
            return;
          }
          setPerformanceByCampaignId((prev) => ({
            ...prev,
            [campaign.id]: performance,
          }));
        })
        .finally(() => {
          if (!active) {
            return;
          }
          setLoadingPerformanceIds((prev) => ({ ...prev, [campaign.id]: false }));
        });
    });

    return () => {
      active = false;
    };
  }, [campaigns]);

  const hasCampaigns = useMemo(() => campaigns.length > 0, [campaigns]);

  return (
    <PageLayout
      title="Performance"
      subtitle="Live campaign metrics from the backend simulation. Select a campaign to view detailed charts."
    >
      {loading ? (
        <div className="row">
          <LoadingSpinner />
          <span>Loading campaigns...</span>
        </div>
      ) : !hasCampaigns ? (
        <Card>
          <p>No campaigns available.</p>
          <p>Create a campaign to start tracking performance.</p>
        </Card>
      ) : (
        <div className="stack">
          {campaigns.map((campaign) => {
            const performance = performanceByCampaignId[campaign.id];
            const isLoadingPerformance = loadingPerformanceIds[campaign.id];

            return (
              <Link
                key={campaign.id}
                className="approvals-card-link"
                to={`/performance/${campaign.id}`}
                aria-label={`Open performance details for ${campaign.name}`}
              >
                <Card>
                  <div className="row row-between row-wrap">
                    <div className="stack-sm">
                      <strong>{campaign.name}</strong>
                      <span className="muted">Campaign ID: {campaign.id}</span>
                    </div>
                    {isLoadingPerformance ? (
                      <div className="row">
                        <LoadingSpinner />
                        <span className="muted">Fetching metrics...</span>
                      </div>
                    ) : performance ? (
                      <div className="performance-card-kpis">
                        <span>Impr: {formatInteger(performance.totals.impressions)}</span>
                        <span>Clicks: {formatInteger(performance.totals.clicks)}</span>
                        <span>Conv: {formatInteger(performance.totals.conversions)}</span>
                        <span>CTR: {formatPercent(performance.totals.ctr)}</span>
                        <span>Spend: {formatCurrency(performance.totals.spend)}</span>
                      </div>
                    ) : (
                      <span className="muted">Metrics unavailable</span>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
};

export default PerformancePage;
