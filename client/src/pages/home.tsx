import { FC } from 'react';
import MainLayout from '../components/MainLayout';

const Home: FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--eva-black)]">
      <main className="flex-grow py-8">
        <MainLayout />
      </main>
    </div>
  );
};

export default Home;
