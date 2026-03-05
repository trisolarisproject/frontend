import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

const Textarea = ({ label, error, id, ...props }: TextareaProps) => {
  const fieldId = id ?? props.name;

  return (
    <label className="field" htmlFor={fieldId}>
      <span className="field-label">{label}</span>
      <textarea id={fieldId} className="textarea" {...props} />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
};

export default Textarea;