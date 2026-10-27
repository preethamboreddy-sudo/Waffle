import { createRoot } from 'react-dom/client';
import AdminApp from './AdminApp';
import './index.css';

const rootElement = document.getElementById('admin-root');
if (!rootElement) throw new Error('Admin app root element was not found.');

createRoot(rootElement).render(<AdminApp />);
