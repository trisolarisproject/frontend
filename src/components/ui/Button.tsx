import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends PropsWithChildren, ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const Button = ({
  children,
  type = "button",
  variant = "primary",
  className,
  ...props
}: ButtonProps) => {
  return (
    <button
      type={type}
      className={`btn btn-${variant}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
