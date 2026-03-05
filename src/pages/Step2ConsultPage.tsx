import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign, Goal, Tone } from "../types";
import Stepper from "../components/Stepper";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Button from "../components/ui/Button";
import Banner from "../components/ui/Banner";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const goalOptions: Goal[] = ["sales", "leads", "app_installs", "brand_awareness"];
const toneOptions: Tone[] = ["bold", "friendly", "luxury", "playful", "minimal"];

const Step2ConsultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [productDescription, setProductDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [goal, setGoal] = useState<Goal>("sales");
  const [tone, setTone] = useState<Tone>("friendly");
  const [keyPointInput, setKeyPointInput] = useState("");
  const [keyPoints, setKeyPoints] = useState<string[]>([]);

  useEffect(() => {
    if (!id) {
      return;
    }

    fakeApi
      .getCampaign(id)
      .then((campaignData) => {
        setCampaign(campaignData);
        if (campaignData?.consult) {
          setProductDescription(campaignData.consult.productDescription);
          setTargetAudience(campaignData.consult.targetAudience);
          setGoal(campaignData.consult.goal);
          setTone(campaignData.consult.tone);
          setKeyPoints(campaignData.consult.keyPoints);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const addKeyPoint = () => {
    const value = keyPointInput.trim();
    if (!value) {
      return;
    }
    setKeyPoints((prev) => [...prev, value]);
    setKeyPointInput("");
  };

  const removeKeyPoint = (index: number) => {
    setKeyPoints((prev) => prev.filter((_, idx) => idx !== index));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!id) {
      return;
    }

    if (!productDescription.trim() || !targetAudience.trim()) {
      setError("Product description and target audience are required.");
      return;
    }

    try {
      setSaving(true);
      await fakeApi.saveConsult(id, {
        productDescription: productDescription.trim(),
        targetAudience: targetAudience.trim(),
        goal,
        tone,
        keyPoints,
      });
      navigate(`/campaigns/${id}/step/3`);
    } catch {
      setError("Unable to save consult inputs.");
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
      <Stepper currentStep={2} />
      <Card>
        <form className="stack" onSubmit={onSubmit}>
          <h2>Step 2: Agentic consult</h2>
          {error ? <Banner kind="error">{error}</Banner> : null}
          <Textarea
            label="Product description"
            value={productDescription}
            onChange={(event) => setProductDescription(event.target.value)}
            rows={4}
            placeholder="Describe product features and value proposition"
          />
          <Input
            label="Target audience"
            value={targetAudience}
            onChange={(event) => setTargetAudience(event.target.value)}
            placeholder="Small business owners, 25-45"
          />

          <label className="field">
            <span className="field-label">Goal</span>
            <select
              className="input"
              value={goal}
              onChange={(event) => setGoal(event.target.value as Goal)}
            >
              {goalOptions.map((value) => (
                <option key={value} value={value}>
                  {value.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Tone</span>
            <select
              className="input"
              value={tone}
              onChange={(event) => setTone(event.target.value as Tone)}
            >
              {toneOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span className="field-label">Key points</span>
            <div className="row">
              <input
                className="input"
                value={keyPointInput}
                onChange={(event) => setKeyPointInput(event.target.value)}
                placeholder="Fast setup"
              />
              <Button type="button" variant="secondary" onClick={addKeyPoint}>
                Add
              </Button>
            </div>

            {keyPoints.length === 0 ? (
              <p className="muted">No key points yet.</p>
            ) : (
              <div className="chips-wrap">
                {keyPoints.map((point, index) => (
                  <button
                    type="button"
                    key={`${point}-${index}`}
                    onClick={() => removeKeyPoint(index)}
                    className="chip"
                  >
                    {point} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="row">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Next"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Step2ConsultPage;