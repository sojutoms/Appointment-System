import Spinner from 'react-bootstrap/Spinner';

export default function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="page-loader" role="status">
      <Spinner animation="border" variant="primary" />
      <span className="text-body-secondary small">{label}</span>
    </div>
  );
}
