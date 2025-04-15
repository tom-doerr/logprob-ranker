import React from 'react';
import OutputRanker from '@/components/OutputRanker';
import MainLayout from '@/components/MainLayout';

const RankerPage: React.FC = () => {
  return (
    <MainLayout>
      <OutputRanker />
    </MainLayout>
  );
};

export default RankerPage;