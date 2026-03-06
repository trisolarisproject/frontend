interface StepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

const labels = [
  "New Campaign",
  "Asset Intake",
  "Agentic Consult",
  "AI Consult Chat",
] as const;

const Stepper = ({ currentStep }: StepperProps) => {
  return (
    <div className="flow-stepper" aria-label="Campaign onboarding progress">
      {labels.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3 | 4;
        const state = step === currentStep ? "active" : step < currentStep ? "done" : "todo";
        return (
          <div key={label} className={`flow-step flow-step-${state}`} aria-current={step === currentStep ? "step" : undefined}>
            {label}
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;
