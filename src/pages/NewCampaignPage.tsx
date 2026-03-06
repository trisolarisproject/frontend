import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Button from "../components/ui/Button";
import Banner from "../components/ui/Banner";
import PageLayout from "../components/PageLayout";
import Stepper from "../components/Stepper";

const NewCampaignPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
      const campaign = await fakeApi.createCampaign({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      navigate(`/campaigns/${campaign.id}/flow/upload-assets`);
    } catch {
      setError("Unable to create campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout title="New Campaign" topContent={<Stepper currentStep={1} />}>
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
          <Textarea
            label="Description (optional)"
            name="campaignDescription"
            placeholder="Add context for this campaign..."
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
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
