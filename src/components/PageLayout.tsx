import type { ReactNode } from "react";

interface PageLayoutProps {
  title: ReactNode;
  subtitle?: ReactNode;
  topContent?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}

const PageLayout = ({ title, subtitle, topContent, children, bodyClassName = "stack" }: PageLayoutProps) => {
  const hasTopContent = Boolean(topContent);

  return (
    <div className="page-layout">
      <header className="page-header-bar">
        <div className="page-header-inner">
          <div className={`page-header-main${hasTopContent ? " page-header-main-with-side" : ""}`}>
            <div className="page-header-text">
              <h1>{title}</h1>
              {subtitle ? <p className="muted">{subtitle}</p> : null}
            </div>
            {topContent ? <div className="page-header-side">{topContent}</div> : null}
          </div>
        </div>
      </header>
      <div className="page-body">
        <div className={bodyClassName ? `page-body-inner ${bodyClassName}` : "page-body-inner"}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
