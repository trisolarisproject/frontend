import { useEffect, useRef, useState } from "react";

interface StepperProps {
  currentStep: 1 | 2 | 3 | 4;
  completedSteps?: 1 | 2 | 3 | 4;
}

const labels = [
  "New Campaign",
  "Upload Assets",
  "Campaign Details",
  "AI Consult",
] as const;

const Stepper = ({ currentStep, completedSteps }: StepperProps) => {
  const previousStepRef = useRef(currentStep);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const completedThrough = completedSteps ?? currentStep;

  useEffect(() => {
    if (currentStep > previousStepRef.current) {
      setDirection("forward");
    } else if (currentStep < previousStepRef.current) {
      setDirection("backward");
    }
    previousStepRef.current = currentStep;
  }, [currentStep]);

  return (
    <div className={`flow-stepper flow-stepper-${direction}`} aria-label="Campaign onboarding progress">
      {labels.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3 | 4;
        const state = step <= completedThrough ? "done" : step === currentStep ? "active" : "todo";
        const isFilled = step <= completedThrough;
        return (
          <div
            key={label}
            className={`flow-step flow-step-${state} ${isFilled ? "flow-step-filled" : ""}`}
            aria-current={step === currentStep ? "step" : undefined}
          >
            <span className="flow-step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;
