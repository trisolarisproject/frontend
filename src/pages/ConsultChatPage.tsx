import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fakeApi } from "../api/fakeApi";
import type { Campaign } from "../types";
import { useInterval } from "../hooks/useInterval";
import Banner from "../components/ui/Banner";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageLayout from "../components/PageLayout";
import Stepper from "../components/Stepper";

type ChatMessage = {
  role: "ai" | "user";
  text: string;
};

const dummyQuestions = [
  "Just some clarifying details before we start: what is the one key action you want viewers to take after seeing this campaign?",
  "Do you want us to prioritize conversion efficiency or rapid reach in the first week?",
  "Are there any competitor styles or phrases we should explicitly avoid?",
];

const THINKING_DELAY_MS = 1200;

const ConsultChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isReadyToBegin, setIsReadyToBegin] = useState(false);
  const pendingReplyRef = useRef<number | null>(null);

  const clearPendingReply = () => {
    if (pendingReplyRef.current !== null) {
      window.clearTimeout(pendingReplyRef.current);
      pendingReplyRef.current = null;
    }
  };

  const queueAiReply = (text: string) => {
    clearPendingReply();
    setIsAiThinking(true);
    pendingReplyRef.current = window.setTimeout(() => {
      setMessages((prev) => [...prev, { role: "ai", text }]);
      setIsAiThinking(false);
      pendingReplyRef.current = null;
    }, THINKING_DELAY_MS);
  };

  useEffect(() => {
    if (!id) {
      return;
    }
    fakeApi
      .getCampaign(id)
      .then((campaignData) => {
        setCampaign(campaignData);
        setMessages([]);
        setQuestionIndex(0);
        setIsReadyToBegin(false);
        queueAiReply(dummyQuestions[0]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    return () => {
      clearPendingReply();
    };
  }, []);

  useInterval(() => {
    if (!id) {
      return;
    }
    void fakeApi.pollFlowStep(id).then((next) => {
      if (!next) {
        return;
      }
      setCampaign(next);
      if ((next.journey?.flowStep ?? 1) > 2) {
        navigate(`/campaigns/${id}/flow/consult-status`, { replace: true });
      }
    });
  }, campaign?.journey?.activeTask === "consult" ? 700 : null);

  const hasFinishedQuestions = useMemo(
    () => questionIndex >= dummyQuestions.length - 1,
    [questionIndex]
  );

  const onSend = (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim() || isAiThinking || isReadyToBegin) {
      return;
    }
    const userText = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);

    if (!hasFinishedQuestions) {
      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      queueAiReply(dummyQuestions[nextIndex]);
    } else {
      clearPendingReply();
      setIsAiThinking(true);
      pendingReplyRef.current = window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: "Thanks, that gives me enough context. We can begin your marketing campaign now.",
          },
        ]);
        setIsAiThinking(false);
        setIsReadyToBegin(true);
        pendingReplyRef.current = null;
      }, THINKING_DELAY_MS);
    }
  };

  const startAnalysis = async () => {
    if (!id || !campaign) {
      return;
    }
    const answers = campaign.journey?.consultAnswers;
    if (!answers) {
      setError("Consult intake data is missing. Please go back.");
      return;
    }
    setError(null);
    setStarting(true);
    try {
      const next = await fakeApi.startFlowStep2Consult(id, {
        audienceDetails: answers.audienceDetails,
        budgetRange: answers.budgetRange,
        timeline: answers.timeline,
        constraints: answers.constraints,
        goal: campaign.consult?.goal ?? "sales",
        tone: campaign.consult?.tone ?? "friendly",
        keyPoints: campaign.consult?.keyPoints ?? [],
      });
      setCampaign(next);
      navigate(`/campaigns/${id}/flow/consult-status`);
    } catch {
      setError("Unable to start AI analysis.");
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="AI Consult Chat"
        subtitle="Respond to AI clarifying questions before analysis starts."
      >
        <div className="row">
          <LoadingSpinner />
          <span>Loading AI consult chat...</span>
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
        <p>Complete Asset Intake first.</p>
        <Link to={`/campaigns/${campaign.id}/flow/asset-intake`}>Go to asset intake</Link>
      </Card>
    );
  }

  const analysisRunning = campaign.journey?.activeTask === "consult";

  return (
    <PageLayout
      title="AI Consult Chat"
      subtitle="Respond to AI clarifying questions before analysis starts."
      topContent={<Stepper currentStep={4} />}
    >
      {error ? <Banner kind="error">{error}</Banner> : null}

      <Card>
        <div className="chat-thread">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-bubble chat-${message.role}`}>
              {message.text}
            </div>
          ))}
          {isAiThinking ? (
            <div className="chat-bubble chat-ai chat-thinking" aria-label="AI is thinking">
              <span className="thinking-dots" aria-hidden="true">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
              </span>
            </div>
          ) : null}
        </div>
        <form className="row" onSubmit={onSend}>
          {isReadyToBegin ? (
            <Button type="button" onClick={startAnalysis} disabled={analysisRunning || starting || isAiThinking}>
              {starting ? "Starting..." : "Begin marketing campaign"}
            </Button>
          ) : (
            <>
              <input
                className="input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type your response..."
                disabled={analysisRunning || isAiThinking}
              />
              <Button type="submit" disabled={!input.trim() || analysisRunning || isAiThinking}>
                Send
              </Button>
            </>
          )}
        </form>
      </Card>
    </PageLayout>
  );
};

export default ConsultChatPage;
