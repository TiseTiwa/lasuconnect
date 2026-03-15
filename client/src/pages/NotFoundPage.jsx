import { Link } from 'react-router-dom';
const NotFoundPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center"><h1 className="text-6xl font-bold text-primary-600">404</h1><p className="text-gray-600 mt-2">Page not found</p><Link to="/" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg">Go Home</Link></div>
  </div>
);
export default NotFoundPage;
