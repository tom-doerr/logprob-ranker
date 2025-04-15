import { FC } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AuthFlow from '../components/AuthFlow';

const Home: FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-100">
      <Header />
      <main className="flex-grow">
        <AuthFlow />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
