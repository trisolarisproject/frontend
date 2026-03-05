interface StepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

const labels = [
  "1. Upload Assets",
  "2. Agentic Consult",
  "3. Generating",
  "4. Results",
] as const;

const Stepper = ({ currentStep }: StepperProps) => {
  return (
    <div className="stepper">
      {labels.map((label, index) => {
        const step = (index + 1) as 1 | 2 | 3 | 4;
        const state = step === currentStep ? "active" : step < currentStep ? "done" : "todo";
        return (
          <div key={label} className={`step step-${state}`}>
            {label}
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;