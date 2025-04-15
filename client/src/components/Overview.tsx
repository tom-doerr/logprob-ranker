import { FC } from 'react';
import FlowVisualization from './FlowVisualization';

const Overview: FC = () => {
  return (
    <section id="overview" className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">OAuth PKCE Authentication</h1>
        <p className="text-neutral-600 mb-6">Connect your users to OpenRouter in one click using Proof Key for Code Exchange (PKCE). This secure authentication flow allows your users to authorize your application to make requests on their behalf.</p>
        
        <div className="flex items-center p-4 bg-neutral-100 rounded-lg mb-6">
          <div className="w-12 h-12 rounded-full bg-[#4F46E5] flex items-center justify-center mr-4">
            <i className="fas fa-shield-alt text-white text-xl"></i>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Why use PKCE?</h3>
            <p className="text-neutral-600">PKCE adds an extra layer of security for public clients that cannot securely store a client secret.</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-[#4F46E5]/20 flex items-center justify-center mr-2">
                <i className="fas fa-lock text-[#4F46E5]"></i>
              </div>
              <h3 className="font-medium text-neutral-900">Secure</h3>
            </div>
            <p className="text-sm text-neutral-600">Prevents auth code interception attacks</p>
          </div>
          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-[#4F46E5]/20 flex items-center justify-center mr-2">
                <i className="fas fa-code text-[#4F46E5]"></i>
              </div>
              <h3 className="font-medium text-neutral-900">Simple</h3>
            </div>
            <p className="text-sm text-neutral-600">Easy to implement in any application</p>
          </div>
          <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-[#4F46E5]/20 flex items-center justify-center mr-2">
                <i className="fas fa-user-shield text-[#4F46E5]"></i>
              </div>
              <h3 className="font-medium text-neutral-900">User Control</h3>
            </div>
            <p className="text-sm text-neutral-600">Users can revoke access at any time</p>
          </div>
        </div>
      </div>
      
      <div className="border-t border-neutral-200 p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Authentication Flow</h2>
        <FlowVisualization />
      </div>
    </section>
  );
};

export default Overview;
