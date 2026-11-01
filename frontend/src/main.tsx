import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { createServicesFromEnvironment } from './services';
import { ServicesProvider } from './shared/ServicesContext';
import { StatusNotice } from './shared/ui';
import './styles/tokens.css';
import './styles/app.css';
import './styles/prototype-components.css';
import './styles/prototype-record.css';
import './styles/prototype-media-waveform.css';
import './styles/prototype-record-b.css';
import './styles/prototype-record-shared.css';
import './styles/prototype-result.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('The application root element is missing.');
const root = createRoot(rootElement);

function StartupFailure({ message }: { message: string }) {
  return <main className="page-shell boundary-page"><section><h1>Dubbed local core is unavailable</h1><StatusNotice tone="error">{message}</StatusNotice><p>No real service was selected and the application did not fall back to the mock.</p></section></main>;
}

try {
  const services = createServicesFromEnvironment();
  await services.initialize();
  root.render(<ServicesProvider services={services}><App /></ServicesProvider>);
} catch (error) {
  root.render(<StartupFailure message={error instanceof Error ? error.message : 'Service initialization failed.'} />);
}
