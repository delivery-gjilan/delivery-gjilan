import LoadingScreen from '@/components/LoadingScreen';
import { useAuthInitialization } from '@/hooks/useAuthInitialization';

export default function Index() {
    useAuthInitialization();
    // Auth initialization in _layout.tsx will handle routing
    // This screen should never be visible as auth init redirects immediately
    return <LoadingScreen />;
}
