/**
 * Ranked Output Component Integration Tests
 * Tests the RankedOutput UI component functionality and interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RankedOutput } from '../components/ui/ranked-output';

// Mock data
const mockAttributeScores = [
  { name: 'Coherence', score: 0.85 },
  { name: 'Relevance', score: 0.92 },
  { name: 'Accuracy', score: 0.78 }
];

const mockOutput = {
  output: 'This is a sample response that contains multiple lines.\nIt includes code examples:\n```javascript\nconst x = 10;\nconsole.log(x);\n```',
  logprob: -0.05,
  index: 0,
  attributeScores: mockAttributeScores,
  rawEvaluation: '{"coherence": 0.85, "relevance": 0.92, "accuracy": 0.78}'
};

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve())
  }
});

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('RankedOutput Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should render output content correctly', () => {
    render(
      <RankedOutput
        output={mockOutput.output}
        logprob={mockOutput.logprob}
        index={mockOutput.index}
        attributeScores={mockOutput.attributeScores}
        rawEvaluation={mockOutput.rawEvaluation}
        onSelect={() => {}}
        isSelected={false}
      />
    );
    
    // Check that content is displayed
    expect(screen.getByText(/This is a sample response/)).toBeInTheDocument();
    
    // Check that code block is rendered with syntax highlighting
    const codeBlock = screen.getByText(/const x = 10;/);
    expect(codeBlock).toBeInTheDocument();
    
    // Check that logprob is displayed
    expect(screen.getByText(/-0.05/)).toBeInTheDocument();
    
    // Check that attribute scores are displayed
    expect(screen.getByText(/Coherence/)).toBeInTheDocument();
    expect(screen.getByText(/0.85/)).toBeInTheDocument();
    expect(screen.getByText(/Relevance/)).toBeInTheDocument();
    expect(screen.getByText(/0.92/)).toBeInTheDocument();
  });
  
  it('should handle selection', async () => {
    const handleSelect = vi.fn();
    
    const { rerender } = render(
      <RankedOutput
        output={mockOutput.output}
        logprob={mockOutput.logprob}
        index={mockOutput.index}
        attributeScores={mockOutput.attributeScores}
        rawEvaluation={mockOutput.rawEvaluation}
        onSelect={handleSelect}
        isSelected={false}
      />
    );
    
    // Find and click the select button
    const selectButton = screen.getByRole('button', { name: /Select/i });
    fireEvent.click(selectButton);
    
    // Check that selection callback was called
    expect(handleSelect).toHaveBeenCalledWith(mockOutput.index);
    
    // Re-render with isSelected=true
    rerender(
      <RankedOutput
        output={mockOutput.output}
        logprob={mockOutput.logprob}
        index={mockOutput.index}
        attributeScores={mockOutput.attributeScores}
        rawEvaluation={mockOutput.rawEvaluation}
        onSelect={handleSelect}
        isSelected={true}
      />
    );
    
    // Check that selected state is visible
    expect(screen.getByText(/Selected/i)).toBeInTheDocument();
  });
  
  it('should handle copy to clipboard', async () => {
    render(
      <RankedOutput
        output={mockOutput.output}
        logprob={mockOutput.logprob}
        index={mockOutput.index}
        attributeScores={mockOutput.attributeScores}
        rawEvaluation={mockOutput.rawEvaluation}
        onSelect={() => {}}
        isSelected={false}
      />
    );
    
    // Find and click the copy button
    const copyButton = screen.getByRole('button', { name: /Copy/i });
    fireEvent.click(copyButton);
    
    // Check that clipboard API was called with the content
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockOutput.output);
    });
  });
  
  it('should show expanded evaluation when toggle is clicked', async () => {
    render(
      <RankedOutput
        output={mockOutput.output}
        logprob={mockOutput.logprob}
        index={mockOutput.index}
        attributeScores={mockOutput.attributeScores}
        rawEvaluation={mockOutput.rawEvaluation}
        onSelect={() => {}}
        isSelected={false}
      />
    );
    
    // Find and click the details toggle
    const detailsButton = screen.getByRole('button', { name: /Details/i });
    fireEvent.click(detailsButton);
    
    // Check that raw evaluation is displayed
    await waitFor(() => {
      expect(screen.getByText(/"coherence": 0.85/)).toBeInTheDocument();
      expect(screen.getByText(/"relevance": 0.92/)).toBeInTheDocument();
    });
  });
  
  it('should handle missing attribute scores gracefully', () => {
    // Render without attribute scores
    render(
      <RankedOutput
        output={mockOutput.output}
        logprob={mockOutput.logprob}
        index={mockOutput.index}
        attributeScores={undefined}
        rawEvaluation={undefined}
        onSelect={() => {}}
        isSelected={false}
      />
    );
    
    // Content should still render
    expect(screen.getByText(/This is a sample response/)).toBeInTheDocument();
    expect(screen.getByText(/-0.05/)).toBeInTheDocument();
    
    // No attribute scores should be visible
    expect(screen.queryByText(/Coherence/)).not.toBeInTheDocument();
  });
  
  it('should display index correctly', () => {
    render(
      <RankedOutput
        output={mockOutput.output}
        logprob={mockOutput.logprob}
        index={3} // Using index 3 instead of 0
        attributeScores={mockOutput.attributeScores}
        rawEvaluation={mockOutput.rawEvaluation}
        onSelect={() => {}}
        isSelected={false}
      />
    );
    
    // Check that the correct index is displayed
    expect(screen.getByText(/Output #4/)).toBeInTheDocument(); // Index is 0-based, display is 1-based
  });
});