import { FC } from 'react';
import CodeBlock from './ui/code-block';
import SectionHeader from './ui/section-header';

const Step3: FC = () => {
  const apiRequestCode = `fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <API_KEY>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-4o',
    messages: [
      {
        role: 'user',
        content: 'Hello!',
      },
    ],
  }),
});`;

  return (
    <section id="step-3" className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        <SectionHeader number={3} title="Use the API key" />

        <p className="text-neutral-600 mb-6">Store the API key securely within the user's browser or in your own database, and use it to make OpenRouter requests.</p>

        <CodeBlock code={apiRequestCode} title="Make an OpenRouter request" />

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6">
          <h3 className="text-base font-medium text-neutral-900 mb-2">Security Best Practices</h3>
          <ul className="space-y-2 text-sm text-neutral-600">
            <li className="flex items-start">
              <i className="fas fa-shield-alt text-[#4F46E5] mt-1 mr-2"></i>
              <span>Store the API key in localStorage or a secure cookie to persist it across sessions.</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-shield-alt text-[#4F46E5] mt-1 mr-2"></i>
              <span>Never expose the API key in client-side code or URLs.</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-shield-alt text-[#4F46E5] mt-1 mr-2"></i>
              <span>Provide users with a way to revoke access if they wish to disconnect your app.</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-shield-alt text-[#4F46E5] mt-1 mr-2"></i>
              <span>Consider using a proxy server for production applications to avoid exposing the API key in client-side code.</span>
            </li>
          </ul>
        </div>

        <div className="bg-neutral-100 rounded-lg p-4">
          <h3 className="text-base font-medium text-neutral-900 mb-2">Sample User Experience</h3>
          <p className="text-sm text-neutral-600 mb-4">Here's how you might implement the user flow in your application:</p>
          
          <div className="grid md:grid-cols-3 gap-4 text-center text-sm">
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="w-10 h-10 bg-[#4F46E5]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <i className="fas fa-link text-[#4F46E5]"></i>
              </div>
              <p className="font-medium text-neutral-900 mb-1">Connect</p>
              <p className="text-neutral-600">User clicks "Connect to OpenRouter" button in your app</p>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="w-10 h-10 bg-[#4F46E5]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <i className="fas fa-key text-[#4F46E5]"></i>
              </div>
              <p className="font-medium text-neutral-900 mb-1">Authorize</p>
              <p className="text-neutral-600">User logs in and authorizes your app on OpenRouter</p>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <div className="w-10 h-10 bg-[#4F46E5]/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <i className="fas fa-check-circle text-[#4F46E5]"></i>
              </div>
              <p className="font-medium text-neutral-900 mb-1">Use</p>
              <p className="text-neutral-600">Your app can now make API calls using their credentials</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Step3;
