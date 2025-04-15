import { FC } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ChatInterface from '../components/ChatInterface';

const Home: FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-100">
      <Header />
      <main className="flex-grow py-8">
        <ChatInterface />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
