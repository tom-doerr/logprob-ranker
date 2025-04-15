import { FC, ReactNode } from 'react';

interface SectionHeaderProps {
  number: number;
  title: string;
  children?: ReactNode;
}

const SectionHeader: FC<SectionHeaderProps> = ({ number, title, children }) => {
  return (
    <div className="flex items-center mb-4">
      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#4F46E5] text-white font-medium mr-3">
        {number}
      </div>
      <h2 className="text-xl font-bold text-neutral-900">{title}</h2>
    </div>
  );
};

export default SectionHeader;
