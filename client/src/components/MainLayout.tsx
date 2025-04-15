import { FC, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChatInterface from './ChatInterface';
import OutputRanker from './OutputRanker';
import { MessageSquare, BarChart2 } from 'lucide-react';

const MainLayout: FC = () => {
  return (
    <div className="container mx-auto max-w-6xl p-4">
      <Tabs defaultValue="output-ranker" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 border border-[var(--eva-orange)] bg-opacity-20">
          <TabsTrigger value="output-ranker" className="flex items-center justify-center data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase">
            <BarChart2 className="h-4 w-4 mr-2" />
            NERV SYSTEM-A
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center justify-center data-[state=active]:bg-[var(--eva-orange)] data-[state=active]:text-black font-mono uppercase">
            <MessageSquare className="h-4 w-4 mr-2" />
            NERV SYSTEM-B
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="output-ranker">
          <OutputRanker />
        </TabsContent>
        
        <TabsContent value="chat">
          <ChatInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MainLayout;