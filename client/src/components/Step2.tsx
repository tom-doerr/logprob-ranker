import { FC } from 'react';
import CodeBlock from './ui/code-block';
import SectionHeader from './ui/section-header';

const Step2: FC = () => {
  const extractCode = `const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');`;

  const exchangeCode = `const response = await fetch('https://openrouter.ai/api/v1/auth/keys', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    code: '<CODE_FROM_QUERY_PARAM>',
    code_verifier: '<CODE_VERIFIER>', // If code_challenge was used
    code_challenge_method: '<CODE_CHALLENGE_METHOD>', // If code_challenge was used
  }),
});
const { key } = await response.json();`;

  return (
    <section id="step-2" className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        <SectionHeader number={2} title="Exchange the code for a user-controlled API key" />

        <p className="text-neutral-600 mb-6">After the user logs in with OpenRouter, they are redirected back to your site with a <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-sm">code</code> parameter in the URL:</p>
        
        <div className="bg-neutral-100 p-3 rounded-md mb-6 overflow-x-auto">
          <code className="font-mono text-sm text-neutral-700">https://your-app.com/callback?code=abc123xyz789</code>
        </div>

        <p className="text-neutral-600 mb-4">Extract this code using the browser API:</p>
        <CodeBlock code={extractCode} title="Extract Code" />

        <p className="text-neutral-600 mb-4">Then use it to make an API call to <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-sm">https://openrouter.ai/api/v1/auth/keys</code> to exchange the code for a user-controlled API key:</p>
        <CodeBlock code={exchangeCode} title="Exchange Code" />

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <i className="fas fa-check-circle text-[#22C55E] mt-1"></i>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-neutral-900">That's it for the PKCE flow!</h3>
              <p className="mt-1 text-sm text-neutral-600">You now have a user-controlled API key that you can use to make requests to OpenRouter on behalf of the user.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Step2;
