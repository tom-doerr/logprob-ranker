import { useState, FC } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

const CodeBlock: FC<CodeBlockProps> = ({ code, language = 'typescript', title = 'Code' }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="bg-neutral-800 rounded-md overflow-hidden mb-6">
      <div className="flex justify-between items-center px-4 py-2 bg-neutral-900">
        <span className="text-neutral-400 text-sm">{title}</span>
        <button 
          className="text-neutral-400 hover:text-white text-sm"
          onClick={copyToClipboard}
        >
          <i className={`${copied ? 'fas fa-check' : 'far fa-copy'} mr-1`}></i> 
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-white font-mono text-sm whitespace-pre">{code}</pre>
      </div>
    </div>
  );
};

export default CodeBlock;
