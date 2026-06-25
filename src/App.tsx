import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppRouter } from './routes/AppRouter';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId || 'demo-placeholder.apps.googleusercontent.com'}>
      <AppRouter />
    </GoogleOAuthProvider>
  );
}

export default App;
