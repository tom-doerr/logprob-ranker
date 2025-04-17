import React from 'react';
import { Activity, ChevronUp, ChevronDown } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';

interface ThreadCountControlProps {
  threadCount: number;
  setThreadCount: (count: number) => void;
}

const ThreadCountControl: React.FC<ThreadCountControlProps> = ({
  threadCount,
  setThreadCount
}) => {
  return (
    <div className="border border-[var(--eva-blue)] rounded-md p-3 nerv-scanline">
      <label htmlFor="thread-count" className="block text-sm font-medium text-[var(--eva-blue)] uppercase tracking-wider mb-2 flex items-center">
        <Activity className="w-4 h-4 mr-1 nerv-pulse" />
        Parallel Threads
      </label>
      <div className="flex items-center gap-2">
        <Input
          id="thread-count"
          type="number"
          min={1}
          value={threadCount}
          onChange={(e) => {
            const inputValue = e.target.value;
            if (inputValue === '') {
              setThreadCount(1); // Default to 1 if empty
            } else {
              const value = parseInt(inputValue);
              if (!isNaN(value)) {
                // Ensure value is at least 1
                setThreadCount(Math.max(1, value));
              }
            }
          }}
          onBlur={() => {
            // Ensure we have a valid value when user leaves the field
            if (threadCount < 1) {
              setThreadCount(1);
            }
          }}
          className="w-full eva-input text-[var(--eva-green)]"
        />
        <div className="flex flex-col">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setThreadCount(Math.min(8, threadCount + 1))}
            className="h-8 px-2 mb-1 border-[var(--eva-blue)] text-[var(--eva-blue)]"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setThreadCount(Math.max(1, threadCount - 1))}
            className="h-8 px-2 border-[var(--eva-blue)] text-[var(--eva-blue)]"
            disabled={threadCount <= 1}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-xs text-[var(--eva-blue)] font-mono nerv-blink">
          {threadCount > 1 
            ? `PARALLEL PROCESSING: ${threadCount} CONCURRENT THREADS` 
            : "SEQUENTIAL PROCESSING (SINGLE THREAD)"}
        </p>
      </div>
    </div>
  );
};

export default ThreadCountControl;