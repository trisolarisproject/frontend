import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Asset, Campaign } from "../types";
import Stepper from "../components/Stepper";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Banner from "../components/ui/Banner";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const Step1AssetsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      return;
    }

    Promise.all([fakeApi.getCampaign(id), fakeApi.listAssets(id)])
      .then(([campaignData, assetData]) => {
        setCampaign(campaignData);
        setAssets(assetData);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    setError(null);
  };

  const canProceed = useMemo(
    () => selectedFiles.length > 0 || assets.length > 0,
    [selectedFiles.length, assets.length]
  );

  const onNext = async () => {
    if (!id) {
      return;
    }

    if (selectedFiles.length === 0 && assets.length === 0) {
      setError("Upload at least one asset before continuing.");
      return;
    }

    try {
      setSaving(true);
      if (selectedFiles.length > 0) {
        await fakeApi.addAssets(id, selectedFiles);
      }
      navigate(`/campaigns/${id}/step/2`);
    } catch {
      setError("Unable to save assets.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="row">
        <LoadingSpinner />
        <span>Loading campaign...</span>
      </div>
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

  return (
    <div className="stack">
      <h1>{campaign.name}</h1>
      <Stepper currentStep={1} />
      <Card>
        <div className="stack">
          <h2>Step 1: Upload assets</h2>
          {error ? <Banner kind="error">{error}</Banner> : null}
          <input type="file" multiple onChange={onFileChange} />

          <div>
            <h3>Uploaded assets</h3>
            {assets.length === 0 && selectedFiles.length === 0 ? (
              <p className="muted">No assets uploaded yet.</p>
            ) : (
              <ul className="list">
                {assets.map((asset) => (
                  <li key={asset.id}>{asset.fileName}</li>
                ))}
                {selectedFiles.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="row">
            <Button onClick={onNext} disabled={!canProceed || saving}>
              {saving ? "Saving..." : "Next"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Step1AssetsPage;