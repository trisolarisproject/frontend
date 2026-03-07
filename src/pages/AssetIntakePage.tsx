import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Asset, Campaign } from "../types";
import Banner from "../components/ui/Banner";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Textarea from "../components/ui/Textarea";
import FlowFooter from "../components/FlowFooter";

const AssetIntakePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [productLink, setProductLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    Promise.all([fakeApi.getCampaign(id), fakeApi.listAssets(id)])
      .then(([campaignData, assetsData]) => {
        setCampaign(campaignData);
        setAssets(assetsData);
        if (campaignData?.consult?.productDescription) {
          setDescription(campaignData.consult.productDescription);
        }
        if (campaignData?.journey?.productLink) {
          setProductLink(campaignData.journey.productLink);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(Array.from(event.target.files ?? []));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) {
      return;
    }
    if (!description.trim()) {
      setError("Product description is required.");
      return;
    }
    if (assets.length === 0 && selectedFiles.length === 0) {
      setError("Upload at least one asset.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      if (selectedFiles.length > 0) {
        await fakeApi.addAssets(id, selectedFiles);
      }
      await fakeApi.saveFlowStep1Intake(id, {
        productDescription: description,
        productLink,
      });
      navigate(`/campaigns/${id}/flow/consult-intake`);
    } catch {
      setError("Unable to save intake.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="row">
        <LoadingSpinner />
        <span>Loading upload assets...</span>
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
    <>
      <Card>
        <form id="asset-intake-form" className="stack" onSubmit={onSubmit}>
          {error ? <Banner kind="error">{error}</Banner> : null}
          <Textarea
            label="Product description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            required
          />
          <Input
            label="Product link"
            value={productLink}
            onChange={(event) => setProductLink(event.target.value)}
            placeholder="https://example.com/product"
          />
          <label className="field">
            <span className="field-label">
              Upload assets<span className="required-mark"> *</span>
            </span>
            <input type="file" multiple onChange={onFileChange} />
          </label>
          <p className="muted">
            Existing assets: {assets.length} | New selected: {selectedFiles.length}
          </p>
        </form>
      </Card>
      <FlowFooter>
        <Button type="submit" form="asset-intake-form" disabled={saving}>
          {saving ? "Saving..." : "Continue"}
        </Button>
      </FlowFooter>
    </>
  );
};

export default AssetIntakePage;
