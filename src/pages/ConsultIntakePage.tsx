import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign, Goal, Tone } from "../types";
import Banner from "../components/ui/Banner";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Textarea from "../components/ui/Textarea";
import PageLayout from "../components/PageLayout";
import Stepper from "../components/Stepper";

const goalOptions: Goal[] = ["sales", "leads", "app_installs", "brand_awareness"];
const toneOptions: Tone[] = ["bold", "friendly", "luxury", "playful", "minimal"];

const ConsultIntakePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [audienceDetails, setAudienceDetails] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [timeline, setTimeline] = useState("");
  const [constraints, setConstraints] = useState("");
  const [goal, setGoal] = useState<Goal>("sales");
  const [tone, setTone] = useState<Tone>("friendly");
  const [keyPointsText, setKeyPointsText] = useState("");

  useEffect(() => {
    if (!id) {
      return;
    }
    fakeApi
      .getCampaign(id)
      .then((campaignData) => {
        setCampaign(campaignData);
        if (campaignData?.consult) {
          setAudienceDetails(campaignData.consult.targetAudience ?? "");
          setGoal(campaignData.consult.goal);
          setTone(campaignData.consult.tone);
          setKeyPointsText(campaignData.consult.keyPoints.join("\n"));
        }
        if (campaignData?.journey?.consultAnswers) {
          setBudgetRange(campaignData.journey.consultAnswers.budgetRange);
          setTimeline(campaignData.journey.consultAnswers.timeline);
          setConstraints(campaignData.journey.consultAnswers.constraints);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!id) {
      return;
    }
    if (!audienceDetails.trim() || !budgetRange.trim() || !timeline.trim()) {
      setError("Audience, budget range, and timeline are required.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await fakeApi.saveFlowConsultInputs(id, {
        audienceDetails: audienceDetails.trim(),
        budgetRange: budgetRange.trim(),
        timeline: timeline.trim(),
        constraints: constraints.trim(),
        goal,
        tone,
        keyPoints: keyPointsText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      navigate(`/campaigns/${id}/flow/consult-chat`);
    } catch {
      setError("Unable to begin AI consult.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="Agentic Consult"
        subtitle="Provide initial inputs before reviewing AI clarifying questions."
      >
        <div className="row">
          <LoadingSpinner />
          <span>Loading consult intake...</span>
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

  return (
    <PageLayout
      title="Agentic Consult"
      subtitle="Provide initial inputs before reviewing AI clarifying questions."
      topContent={<Stepper currentStep={3} />}
    >
      <Card>
        <form className="stack" onSubmit={onSubmit}>
          {error ? <Banner kind="error">{error}</Banner> : null}
          <Input
            label="Who is the primary audience?"
            value={audienceDetails}
            onChange={(event) => setAudienceDetails(event.target.value)}
            required
          />
          <Input
            label="Budget range"
            value={budgetRange}
            onChange={(event) => setBudgetRange(event.target.value)}
            placeholder="$2k-$5k"
            required
          />
          <Input
            label="Campaign timeline"
            value={timeline}
            onChange={(event) => setTimeline(event.target.value)}
            placeholder="2 weeks"
            required
          />
          <Textarea
            label="Brand constraints / must-avoid"
            value={constraints}
            onChange={(event) => setConstraints(event.target.value)}
            rows={3}
          />
          <label className="field">
            <span className="field-label">Primary goal</span>
            <select className="input" value={goal} onChange={(event) => setGoal(event.target.value as Goal)}>
              {goalOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Tone</span>
            <select className="input" value={tone} onChange={(event) => setTone(event.target.value as Tone)}>
              {toneOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <Textarea
            label="Key product points (one per line)"
            value={keyPointsText}
            onChange={(event) => setKeyPointsText(event.target.value)}
            rows={4}
          />
          <div className="row">
            <Button type="submit" disabled={saving}>
              {saving ? "Preparing..." : "Continue to Clarifying Questions"}
            </Button>
          </div>
        </form>
      </Card>
    </PageLayout>
  );
};

export default ConsultIntakePage;
