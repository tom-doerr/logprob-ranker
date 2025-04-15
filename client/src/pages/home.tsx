import { FC } from 'react';
import MainLayout from '@/components/MainLayout';
import ChatInterface from '@/components/ChatInterface';
import SocialPreview from '@/components/SocialPreview';

const Home: FC = () => {
  return (
    <MainLayout>
      <ChatInterface />
    </MainLayout>
  );
};

export default Home;
