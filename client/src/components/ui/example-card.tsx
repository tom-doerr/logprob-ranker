import React from 'react';

interface LogProbExample {
  prompt: string;
  variants: number;
  template: string;
  results: any[];
}

interface ExampleCardProps {
  example: LogProbExample;
  onClick: (example: LogProbExample) => void;
}

export const ExampleCard: React.FC<ExampleCardProps> = ({ example, onClick }) => {
  return (
    <div 
      onClick={() => onClick(example)}
      className="border border-[var(--eva-orange)] rounded-md p-4 cursor-pointer hover:bg-black/10 transition-colors nerv-scanline"
    >
      <h3 className="font-medium mb-2 text-[var(--eva-orange)] uppercase tracking-wider nerv-blink">{example.prompt}</h3>
      <p className="text-sm text-[var(--eva-text)] font-mono">
        VARIANTS: {example.variants}
      </p>
      <pre className="text-xs bg-black/5 p-2 mt-2 rounded overflow-x-auto text-[var(--eva-green)] border border-[var(--eva-orange)]/30">
        {example.template}
      </pre>
    </div>
  );
};

export default ExampleCard;