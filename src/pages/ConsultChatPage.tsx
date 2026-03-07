import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign, ClarifyingQuestion } from "../types";
import Banner from "../components/ui/Banner";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Textarea from "../components/ui/Textarea";
import FlowFooter from "../components/FlowFooter";

const ConsultChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
  const [editingByQuestionId, setEditingByQuestionId] = useState<Record<string, boolean>>({});
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    Promise.all([fakeApi.getCampaign(id), fakeApi.getFlowClarifyingQuestions(id)])
      .then(([campaignData, clarifyingData]) => {
        setCampaign(campaignData);
        setQuestions(clarifyingData.questions);
        setSavedAnswers(clarifyingData.answers);
        setAnswers(() => {
          const seeded: Record<string, string> = {};
          clarifyingData.questions.forEach((question) => {
            seeded[question.id] = clarifyingData.answers[question.id] ?? "";
          });
          return seeded;
        });
        setEditingByQuestionId(() => {
          const seeded: Record<string, boolean> = {};
          clarifyingData.questions.forEach((question) => {
            seeded[question.id] = !(clarifyingData.answers[question.id] ?? "").trim();
          });
          return seeded;
        });
      })
      .catch(() => setError("Unable to load clarifying questions."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!campaign) {
      return;
    }
    if ((campaign.journey?.flowStep ?? 1) > 2 || campaign.journey?.activeTask === "consult") {
      navigate(`/campaigns/${campaign.id}/flow/consult-status`, { replace: true });
    }
  }, [campaign, navigate]);

  const unansweredCount = useMemo(
    () => questions.filter((question) => !(answers[question.id] ?? "").trim()).length,
    [questions, answers]
  );

  const saveAnswer = async (questionId: string) => {
    if (!id) {
      return;
    }
    const nextValue = (answers[questionId] ?? "").trim();
    if (!nextValue) {
      setError("Add an answer before saving.");
      return;
    }

    setError(null);
    setSavingQuestionId(questionId);
    try {
      const nextCampaign = await fakeApi.saveFlowClarifyingAnswer(id, {
        questionId,
        answer: nextValue,
      });
      setCampaign(nextCampaign);
      setSavedAnswers((prev) => ({ ...prev, [questionId]: nextValue }));
      setEditingByQuestionId((prev) => ({ ...prev, [questionId]: false }));
    } catch {
      setError("Unable to save this answer.");
    } finally {
      setSavingQuestionId(null);
    }
  };

  const submitAnswers = async () => {
    if (!id || !campaign) {
      return;
    }
    const consultAnswers = campaign.journey?.consultAnswers;
    if (!consultAnswers) {
      setError("Consult intake data is missing. Please go back.");
      return;
    }
    if (unansweredCount > 0) {
      setError("Please answer all clarifying questions before submitting.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      let latestCampaign = campaign;
      const latestSavedAnswers = { ...savedAnswers };

      for (const question of questions) {
        const nextValue = (answers[question.id] ?? "").trim();
        if (latestSavedAnswers[question.id] === nextValue) {
          continue;
        }
        latestCampaign = await fakeApi.saveFlowClarifyingAnswer(id, {
          questionId: question.id,
          answer: nextValue,
        });
        latestSavedAnswers[question.id] = nextValue;
      }

      setCampaign(latestCampaign);
      setSavedAnswers(latestSavedAnswers);

      const clarifyingSummary = questions
        .map(
          (question, index) =>
            `${index + 1}. ${question.prompt}\nAnswer: ${(answers[question.id] ?? "").trim()}`
        )
        .join("\n\n");

      await fakeApi.startFlowStep2Consult(id, {
        audienceDetails: consultAnswers.audienceDetails,
        budgetRange: consultAnswers.budgetRange,
        timeline: consultAnswers.timeline,
        constraints: [consultAnswers.constraints.trim(), `Clarifying answers:\n${clarifyingSummary}`]
          .filter(Boolean)
          .join("\n\n"),
        goal: campaign.consult?.goal ?? "sales",
        tone: campaign.consult?.tone ?? "friendly",
        keyPoints: campaign.consult?.keyPoints ?? [],
      });

      navigate(`/campaigns/${id}/flow/consult-status`);
    } catch {
      setError("Unable to submit clarifying answers.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="row">
        <LoadingSpinner />
        <span>Loading clarifying questions...</span>
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

  const flowStep = campaign.journey?.flowStep ?? 1;
  if (flowStep < 2) {
    return (
      <Card>
        <p>Complete Upload Assets first.</p>
        <Link to={`/campaigns/${campaign.id}/flow/upload-assets`}>Go to upload assets</Link>
      </Card>
    );
  }

  if ((campaign.journey?.flowStep ?? 1) > 2 || campaign.journey?.activeTask === "consult") {
    return null;
  }

  return (
    <>
      {error ? <Banner kind="error">{error}</Banner> : null}

      <div className="stack">
        {questions.map((question, index) => {
          const currentValue = answers[question.id] ?? "";
          const isSaved = currentValue.trim() !== "" && currentValue.trim() === (savedAnswers[question.id] ?? "");
          const isEditing = editingByQuestionId[question.id] ?? !isSaved;
          const isSaving = savingQuestionId === question.id;

          return (
            <Card key={question.id}>
              <div className="stack-sm">
                <div className="row row-between">
                  <strong>Question {index + 1}</strong>
                  <span className={`badge ${isSaved ? "badge-success" : "badge-neutral"}`}>
                    {isSaved ? "Saved" : "Unsaved"}
                  </span>
                </div>
                <p className="qa-question">{question.prompt}</p>
                <Textarea
                  label="Your answer"
                  value={currentValue}
                  onChange={(event) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [question.id]: event.target.value,
                    }))
                  }
                  placeholder={question.placeholder}
                  rows={4}
                  required
                  disabled={!isEditing}
                />
                <div className="row">
                  {isSaved && !isEditing ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setEditingByQuestionId((prev) => ({
                          ...prev,
                          [question.id]: true,
                        }))
                      }
                    >
                      Edit
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        void saveAnswer(question.id);
                      }}
                      disabled={isSaving || !currentValue.trim()}
                    >
                      {isSaving ? "Saving..." : "Save answer"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

      </div>
      <FlowFooter>
        <div className="row row-between row-wrap">
          <span className="muted">
            {unansweredCount === 0
              ? "All answers provided."
              : `${unansweredCount} question${unansweredCount > 1 ? "s" : ""} still need answers.`}
          </span>
          <Button type="button" onClick={() => void submitAnswers()} disabled={submitting || unansweredCount > 0}>
            {submitting ? "Submitting..." : "Submit my answers"}
          </Button>
        </div>
      </FlowFooter>
    </>
  );
};

export default ConsultChatPage;
