import { FC } from 'react';
import Overview from './Overview';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import DemoSection from './DemoSection';
import Sidebar from './Sidebar';

const AuthFlow: FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="lg:flex lg:items-start lg:space-x-8">
        <Sidebar />
        
        <div className="lg:w-3/4 space-y-8">
          <Overview />
          <Step1 />
          <Step2 />
          <Step3 />
          <DemoSection />
        </div>
      </div>
    </div>
  );
};

export default AuthFlow;
