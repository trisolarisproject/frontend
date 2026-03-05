import type { PropsWithChildren } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends PropsWithChildren {
  type?: "button" | "submit";
  variant?: Variant;
  disabled?: boolean;
  onClick?: () => void;
}

const Button = ({
  children,
  type = "button",
  variant = "primary",
  disabled,
  onClick,
}: ButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  );
};

export default Button;