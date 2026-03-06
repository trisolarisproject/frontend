import type { ReactNode } from "react";

interface PageLayoutProps {
  title: ReactNode;
  subtitle?: ReactNode;
  topContent?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}

const PageLayout = ({ title, subtitle, topContent, children, bodyClassName = "stack" }: PageLayoutProps) => {
  return (
    <div className="page-layout">
      <header className="page-header-bar">
        <div className="page-header-inner">
          <div className="page-header-text">
            <h1>{title}</h1>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
        </div>
      </header>
      {topContent ? (
        <div className="page-top-slot">
          <div className="page-top-slot-inner">{topContent}</div>
        </div>
      ) : null}
      <div className="page-body">
        <div className={bodyClassName ? `page-body-inner ${bodyClassName}` : "page-body-inner"}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
