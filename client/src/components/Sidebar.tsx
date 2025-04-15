import { FC } from 'react';

const Sidebar: FC = () => {
  return (
    <div className="hidden lg:block lg:w-1/4 sticky top-8">
      <nav className="space-y-1 bg-white rounded-lg shadow p-4">
        <h3 className="font-medium text-neutral-900 mb-3">OAuth PKCE Guide</h3>
        <ul className="space-y-2">
          <li>
            <a href="#overview" className="flex items-center text-[#4F46E5] font-medium px-2 py-1.5 rounded-md bg-neutral-100">
              <span className="mr-2 w-5 h-5 flex items-center justify-center rounded-full bg-[#4F46E5] text-white text-xs">1</span>
              Overview
            </a>
          </li>
          <li>
            <a href="#step-1" className="flex items-center text-neutral-700 hover:text-[#4F46E5] px-2 py-1.5 rounded-md">
              <span className="mr-2 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 text-xs">2</span>
              Send Users to OpenRouter
            </a>
          </li>
          <li>
            <a href="#step-2" className="flex items-center text-neutral-700 hover:text-[#4F46E5] px-2 py-1.5 rounded-md">
              <span className="mr-2 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 text-xs">3</span>
              Exchange Code for API Key
            </a>
          </li>
          <li>
            <a href="#step-3" className="flex items-center text-neutral-700 hover:text-[#4F46E5] px-2 py-1.5 rounded-md">
              <span className="mr-2 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 text-xs">4</span>
              Use the API Key
            </a>
          </li>
          <li>
            <a href="#demo" className="flex items-center text-neutral-700 hover:text-[#4F46E5] px-2 py-1.5 rounded-md">
              <span className="mr-2 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 text-xs">5</span>
              Live Demo
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
