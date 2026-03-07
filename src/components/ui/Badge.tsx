import type { PropsWithChildren } from "react";

interface BadgeProps extends PropsWithChildren {
  tone?: "neutral" | "success" | "warning" | "error";
}

const Badge = ({ children, tone = "neutral" }: BadgeProps) => {
  return <span className={`badge badge-${tone}`}>{children}</span>;
};

export default Badge;
