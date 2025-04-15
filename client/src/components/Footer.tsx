import { FC } from 'react';

const Footer: FC = () => {
  return (
    <footer className="bg-[#0F172A] text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 bg-[#4F46E5] rounded-md flex items-center justify-center">
                <i className="fas fa-link"></i>
              </div>
              <span className="font-semibold text-xl">OpenRouter Auth</span>
            </div>
            <p className="text-neutral-300 text-sm">Secure authentication for your AI applications using OpenRouter's OAuth PKCE implementation.</p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-4">Resources</h3>
            <ul className="space-y-2 text-neutral-300 text-sm">
              <li><a href="https://openrouter.ai/docs" className="hover:text-white">OpenRouter API Documentation</a></li>
              <li><a href="https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce" className="hover:text-white">OAuth PKCE Guide</a></li>
              <li><a href="https://openrouter.ai/security" className="hover:text-white">Security Best Practices</a></li>
              <li><a href="https://discord.gg/openrouter" className="hover:text-white">Developer Community</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-4">Connect</h3>
            <ul className="space-y-2 text-neutral-300 text-sm">
              <li><a href="https://github.com/openrouter-ai" className="hover:text-white flex items-center"><i className="fab fa-github mr-2"></i> GitHub</a></li>
              <li><a href="https://discord.gg/openrouter" className="hover:text-white flex items-center"><i className="fab fa-discord mr-2"></i> Discord</a></li>
              <li><a href="https://twitter.com/openrouter_ai" className="hover:text-white flex items-center"><i className="fab fa-twitter mr-2"></i> Twitter</a></li>
              <li><a href="mailto:support@openrouter.ai" className="hover:text-white flex items-center"><i className="fas fa-envelope mr-2"></i> Contact Support</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-neutral-700 text-center text-neutral-400 text-sm">
          <p>&copy; {new Date().getFullYear()} OpenRouter. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
