import { FC } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MainLayout from '../components/MainLayout';

const Home: FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-100">
      <Header />
      <main className="flex-grow py-8">
        <MainLayout />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
