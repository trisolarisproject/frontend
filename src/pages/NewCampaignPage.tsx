import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Banner from "../components/ui/Banner";
import PageLayout from "../components/PageLayout";

const NewCampaignPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }

    try {
      setSaving(true);
      const campaign = await fakeApi.createCampaign({ name: name.trim() });
      navigate(`/campaigns/${campaign.id}/flow/asset-intake`);
    } catch {
      setError("Unable to create campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout title="New Campaign">
      <Card>
        <form className="stack" onSubmit={onSubmit}>
          {error ? <Banner kind="error">{error}</Banner> : null}
          <Input
            label="Campaign name"
            name="campaignName"
            placeholder="Spring Product Launch"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="row">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Campaign"}
            </Button>
          </div>
        </form>
      </Card>
    </PageLayout>
  );
};

export default NewCampaignPage;
