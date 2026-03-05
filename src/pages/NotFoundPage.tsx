import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout";

const NotFoundPage = () => {
  return (
    <PageLayout title="Page not found">
      <p>That page does not exist.</p>
      <Link to="/campaigns">Go back to campaigns</Link>
    </PageLayout>
  );
};

export default NotFoundPage;
