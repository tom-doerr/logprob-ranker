import { FC } from 'react';

const FlowVisualization: FC = () => {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-2">
              <i className="fas fa-laptop-code text-neutral-500 text-xl"></i>
            </div>
            <div className="text-center">
              <p className="font-medium text-neutral-900">Your App</p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-2">
              <i className="fas fa-user text-neutral-500 text-xl"></i>
            </div>
            <div className="text-center">
              <p className="font-medium text-neutral-900">User</p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-[#4F46E5]/20 rounded-full flex items-center justify-center mb-2">
              <i className="fas fa-server text-[#4F46E5] text-xl"></i>
            </div>
            <div className="text-center">
              <p className="font-medium text-neutral-900">OpenRouter</p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          {/* Step 1 */}
          <div className="flex items-center">
            <div className="w-1/3 text-right pr-4">
              <span className="inline-block px-2 py-1 bg-neutral-200 rounded text-xs font-medium">Generate code verifier</span>
            </div>
            <div className="w-1/3 flex justify-center">
              <div className="h-10 border-l-2 border-dashed border-neutral-300"></div>
            </div>
            <div className="w-1/3"></div>
          </div>
          
          {/* Step 2 */}
          <div className="flex items-center">
            <div className="w-1/3 text-right pr-4">
              <span className="inline-block px-2 py-1 bg-neutral-200 rounded text-xs font-medium">Create SHA-256 code challenge</span>
            </div>
            <div className="w-1/3 flex justify-center">
              <div className="h-10 border-l-2 border-dashed border-neutral-300"></div>
            </div>
            <div className="w-1/3"></div>
          </div>
          
          {/* Step 3 */}
          <div className="flex items-center">
            <div className="w-1/3 text-right pr-4">
              <span className="inline-block px-2 py-1 bg-neutral-200 rounded text-xs font-medium">Redirect to authorization URL</span>
            </div>
            <div className="w-1/3 flex justify-center">
              <i className="fas fa-arrow-right text-[#4F46E5]"></i>
            </div>
            <div className="w-1/3">
              <span className="inline-block px-2 py-1 bg-neutral-200 rounded text-xs font-medium">Prompted to log in</span>
            </div>
          </div>
          
          {/* Step 4 */}
          <div className="flex items-center">
            <div className="w-1/3"></div>
            <div className="w-1/3 flex justify-center">
              <i className="fas fa-arrow-right text-[#4F46E5]"></i>
            </div>
            <div className="w-1/3">
              <span className="inline-block px-2 py-1 bg-[#4F46E5]/20 text-[#4F46E5] rounded text-xs font-medium">Authenticate user</span>
            </div>
          </div>
          
          {/* Step 5 */}
          <div className="flex items-center">
            <div className="w-1/3"></div>
            <div className="w-1/3 flex justify-center">
              <i className="fas fa-arrow-left text-[#4F46E5]"></i>
            </div>
            <div className="w-1/3">
              <span className="inline-block px-2 py-1 bg-[#4F46E5]/20 text-[#4F46E5] rounded text-xs font-medium">Return auth code</span>
            </div>
          </div>
          
          {/* Step 6 */}
          <div className="flex items-center">
            <div className="w-1/3 text-right pr-4">
              <span className="inline-block px-2 py-1 bg-neutral-200 rounded text-xs font-medium">Exchange code + verifier for API key</span>
            </div>
            <div className="w-1/3 flex justify-center">
              <i className="fas fa-arrow-right text-[#4F46E5]"></i>
            </div>
            <div className="w-1/3">
              <span className="inline-block px-2 py-1 bg-[#4F46E5]/20 text-[#4F46E5] rounded text-xs font-medium">Validate code & verifier</span>
            </div>
          </div>
          
          {/* Step 7 */}
          <div className="flex items-center">
            <div className="w-1/3"></div>
            <div className="w-1/3 flex justify-center">
              <i className="fas fa-arrow-left text-[#4F46E5]"></i>
            </div>
            <div className="w-1/3">
              <span className="inline-block px-2 py-1 bg-[#4F46E5]/20 text-[#4F46E5] rounded text-xs font-medium">Return API key</span>
            </div>
          </div>
          
          {/* Step 8 */}
          <div className="flex items-center">
            <div className="w-1/3 text-right pr-4">
              <span className="inline-block px-2 py-1 bg-neutral-200 rounded text-xs font-medium">Store API key securely</span>
            </div>
            <div className="w-1/3 flex justify-center">
              <div className="h-10 border-l-2 border-dashed border-neutral-300"></div>
            </div>
            <div className="w-1/3"></div>
          </div>
          
          {/* Step 9 */}
          <div className="flex items-center">
            <div className="w-1/3 text-right pr-4">
              <span className="inline-block px-2 py-1 bg-[#22C55E]/20 text-[#22C55E] rounded text-xs font-medium">Make API requests with the key</span>
            </div>
            <div className="w-1/3 flex justify-center">
              <i className="fas fa-arrow-right text-[#4F46E5]"></i>
            </div>
            <div className="w-1/3">
              <span className="inline-block px-2 py-1 bg-[#22C55E]/20 text-[#22C55E] rounded text-xs font-medium">Process API requests</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlowVisualization;
