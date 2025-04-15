import { FC, useState, ReactNode } from 'react';

interface TabData {
  id: string;
  label: string;
  content: ReactNode;
}

interface CodeTabsProps {
  tabs: TabData[];
}

const CodeTabs: FC<CodeTabsProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="mb-6">
      <div className="flex border-b border-neutral-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-b-2 border-[#4F46E5] text-[#4F46E5]'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="relative mt-3">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`${tab.id}-tab`}
            className={activeTab === tab.id ? '' : 'hidden'}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CodeTabs;
