import { FC, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChatInterface from './ChatInterface';
import OutputRanker from './OutputRanker';
import { MessageSquare, BarChart2, Power } from 'lucide-react';

const MainLayout: FC = () => {
  return (
    <div className="container mx-auto max-w-6xl p-4 relative">
      {/* Eva Interface Decorations */}
      <div className="absolute top-0 left-0 w-full h-4 bg-[var(--eva-orange)] opacity-30 z-10"></div>
      <div className="absolute top-4 left-0 w-full opacity-75 text-center text-[var(--eva-orange)] font-mono text-sm tracking-widest z-10">
        NERV CENTRAL DOGMA - EVA COORDINATION SYSTEM
      </div>
      <div className="absolute top-0 right-0 p-2 text-[var(--eva-orange)] font-mono text-xs z-10 flex items-center">
        <Power className="h-4 w-4 mr-1 animate-pulse" />
        MAGI SYSTEM ACTIVE
      </div>
      
      {/* Corner Decorations */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[var(--eva-orange)] opacity-60"></div>
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[var(--eva-orange)] opacity-60"></div>
      
      {/* NERV Logo Watermark */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[var(--eva-orange)] opacity-5 text-9xl font-bold z-0">
        NERV
      </div>
      
      <Tabs defaultValue="output-ranker" className="w-full mt-8">
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