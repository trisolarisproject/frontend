import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = ({ label, error, id, ...props }: InputProps) => {
  const fieldId = id ?? props.name;

  return (
    <label className="field" htmlFor={fieldId}>
      <span className="field-label">{label}</span>
      <input id={fieldId} className="input" {...props} />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
};

export default Input;