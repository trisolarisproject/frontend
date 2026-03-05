import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="stack">
      <h1>Page not found</h1>
      <p>That page does not exist.</p>
      <Link to="/campaigns">Go back to campaigns</Link>
    </div>
  );
};

export default NotFoundPage;