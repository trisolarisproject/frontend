import { useLocation } from "react-router-dom";
import Card from "../components/ui/Card";

const prettify = (path: string): string =>
  path
    .replace("/", "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const SidebarPlaceholderPage = () => {
  const { pathname } = useLocation();
  const title = prettify(pathname);

  return (
    <div className="stack">
      <h1>{title}</h1>
      <Card>
        <p>{title} is a generic placeholder section.</p>
        <p className="muted">
          You can wire real charts, analytics, and tables here later.
        </p>
      </Card>
    </div>
  );
};

export default SidebarPlaceholderPage;
