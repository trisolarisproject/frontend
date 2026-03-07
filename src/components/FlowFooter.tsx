import type { ReactNode } from "react";

interface FlowFooterProps {
  children: ReactNode;
}

const FlowFooter = ({ children }: FlowFooterProps) => {
  return (
    <div className="flow-fixed-footer" role="region" aria-label="Flow actions">
      <div className="flow-fixed-footer-inner">{children}</div>
    </div>
  );
};

export default FlowFooter;
