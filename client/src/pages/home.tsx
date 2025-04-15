import { FC } from 'react';
import MainLayout from '../components/MainLayout';
import SocialPreview from '../components/SocialPreview';

const Home: FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--eva-black)]">
      <main className="flex-grow py-8">
        <MainLayout />
      </main>
      <SocialPreview />
    </div>
  );
};

export default Home;
