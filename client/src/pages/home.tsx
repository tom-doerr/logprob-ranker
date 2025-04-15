import { FC } from 'react';
import MainLayout from '../components/MainLayout';
import SocialPreview from '../components/SocialPreview';
import { ModelConfigProvider } from '../hooks/use-model-config';

const Home: FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--eva-black)]">
      <main className="flex-grow py-8">
        <ModelConfigProvider>
          <MainLayout />
        </ModelConfigProvider>
      </main>
      <SocialPreview />
    </div>
  );
};

export default Home;
