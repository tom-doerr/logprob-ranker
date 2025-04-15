import { FC } from 'react';
import MainLayout from '@/components/MainLayout';
import OutputRanker from '@/components/OutputRanker';

const RankerPage: FC = () => {
  return (
    <MainLayout>
      <OutputRanker />
    </MainLayout>
  );
};

export default RankerPage;