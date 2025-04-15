import { FC } from 'react';
import CodeBlock from './ui/code-block';
import CodeTabs from './CodeTabs';
import SectionHeader from './ui/section-header';

const Step1: FC = () => {
  const s256ChallengeCode = `https://openrouter.ai/auth?callback_url=<YOUR_SITE_URL>&code_challenge=<CODE_CHALLENGE>&code_challenge_method=S256`;
  const plainChallengeCode = `https://openrouter.ai/auth?callback_url=<YOUR_SITE_URL>&code_challenge=<CODE_CHALLENGE>&code_challenge_method=plain`;
  const noChallengeCode = `https://openrouter.ai/auth?callback_url=<YOUR_SITE_URL>`;

  const codeVerifierExample = `
async function createSHA256CodeChallenge(input: string) {
  // Encode input as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  
  // Hash using SHA-256
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  // Convert to base64url encoding
  let binary = '';
  const bytes = new Uint8Array(hash);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  // Base64 encode and make URL safe
  return btoa(binary)
    .replace(/\\+/g, '-')
    .replace(/\\//g, '_')
    .replace(/=+$/, '');
}

const codeVerifier = 'your-random-string';
const generatedCodeChallenge = await createSHA256CodeChallenge(codeVerifier);`;

  return (
    <section id="step-1" className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-6">
        <SectionHeader number={1} title="Send your user to OpenRouter" />

        <p className="text-neutral-600 mb-6">
          To start the PKCE flow, send your user to OpenRouter's <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-sm">/auth</code> URL 
          with a <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-sm">callback_url</code> parameter pointing back to your site:
        </p>

        <CodeTabs 
          tabs={[
            {
              id: 's256',
              label: 'S256 Code Challenge (Recommended)',
              content: <CodeBlock code={s256ChallengeCode} title="URL with S256 Challenge" />
            },
            {
              id: 'plain',
              label: 'Plain Code Challenge',
              content: <CodeBlock code={plainChallengeCode} title="URL with Plain Challenge" />
            },
            {
              id: 'none',
              label: 'Without Code Challenge',
              content: <CodeBlock code={noChallengeCode} title="URL without Challenge" />
            }
          ]}
        />

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <i className="fas fa-info-circle text-[#4F46E5] mt-1"></i>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-neutral-900">The code_challenge parameter</h3>
              <p className="mt-1 text-sm text-neutral-600">
                The <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-xs">code_challenge</code> parameter 
                is optional but recommended for security. Your user will be prompted to log in to OpenRouter and authorize your app. 
                After authorization, they will be redirected back to your site with a 
                <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-xs">code</code> parameter in the URL.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-100 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-neutral-900 mb-3">Use SHA-256 for Maximum Security</h3>
          <p className="text-neutral-600 mb-4">
            For maximum security, set <code className="bg-white px-1 py-0.5 rounded font-mono text-sm">code_challenge_method</code> to 
            <code className="bg-white px-1 py-0.5 rounded font-mono text-sm">S256</code>, and set 
            <code className="bg-white px-1 py-0.5 rounded font-mono text-sm">code_challenge</code> to the base64 encoding of 
            the sha256 hash of <code className="bg-white px-1 py-0.5 rounded font-mono text-sm">code_verifier</code>.
          </p>
          <a 
            href="https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce" 
            className="text-[#4F46E5] hover:text-[#6366F1] font-medium flex items-center" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <span>Learn more about PKCE in Auth0's docs</span>
            <i className="fas fa-external-link-alt ml-1 text-xs"></i>
          </a>
        </div>

        <h3 className="text-lg font-medium text-neutral-900 mb-3">How to Generate a Code Challenge</h3>
        <p className="text-neutral-600 mb-4">
          The following example leverages the Web Crypto API and browser-native functions to generate a code challenge for the S256 method:
        </p>

        <CodeBlock code={codeVerifierExample} title="Generate Code Challenge" />

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <i className="fas fa-laptop-code text-neutral-500 mt-1"></i>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-neutral-900">Localhost Apps</h3>
              <p className="mt-1 text-sm text-neutral-600">
                If your app is a local-first app or otherwise doesn't have a public URL, it is recommended to test with 
                <code className="bg-neutral-100 px-1 py-0.5 rounded font-mono text-xs">http://localhost:3000</code> as the callback and referrer URLs.
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                When moving to production, replace the localhost/private referrer URL with a public GitHub repo or a link to your project website.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Step1;
