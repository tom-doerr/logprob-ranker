import { FC, useState } from 'react';
import { X, ExternalLink, Twitter, Facebook, Copy, Check, Share2 } from 'lucide-react';
import { Button } from './ui/button';

const SocialPreview: FC = () => {
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const previewUrl = "/assets/llm-ranking.png";
  const appUrl = window.location.origin;
  
  const handleClose = () => {
    setShowPreview(false);
  };
  
  const handleTogglePreview = () => {
    setShowPreview(prev => !prev);
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  return (
    <>
      {/* Toggle button */}
      {!showPreview && (
        <Button
          onClick={handleTogglePreview}
          className="fixed bottom-4 right-4 h-10 w-10 rounded-full bg-[var(--eva-orange)] hover:bg-[var(--eva-orange-dark)] shadow-lg z-50 flex items-center justify-center"
        >
          <Share2 className="h-4 w-4 text-black" />
        </Button>
      )}
      
      {/* Preview panel */}
      {showPreview && (
        <div className="fixed bottom-4 right-4 w-96 bg-[var(--eva-black)] border-2 border-[var(--eva-orange)] rounded-md shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-[var(--eva-orange)] p-3 flex justify-between items-center">
            <div className="text-black font-mono font-bold tracking-wide flex items-center text-sm">
              <Twitter className="h-4 w-4 mr-2" />
              SOCIAL PREVIEW CARD
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 hover:bg-[var(--eva-orange-dark)]" 
              onClick={handleClose}
            >
              <X className="h-4 w-4 text-black" />
            </Button>
          </div>
          
          {/* Preview image */}
          <div className="relative">
            <img 
              src={previewUrl} 
              alt="Social preview" 
              className="w-full h-auto border-b border-[var(--eva-orange)]"
            />
            <a 
              href={previewUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="absolute top-2 right-2 bg-black/70 p-1 rounded-md hover:bg-black"
            >
              <ExternalLink className="h-4 w-4 text-[var(--eva-orange)]" />
            </a>
          </div>
          
          {/* Info */}
          <div className="p-4 text-[var(--eva-text)]">
            <h3 className="text-[var(--eva-orange)] font-mono text-xs mb-2">LINK PREVIEW STATUS</h3>
            <p className="text-xs mb-4 font-mono">This is how your site will appear when shared on social media platforms. The preview image shows your LLM Completion Ranking interface with Evangelion-inspired styling.</p>
            
            {/* Platform status */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs">
                  <Twitter className="h-3 w-3 mr-2 text-[var(--eva-blue)]" />
                  <span>Twitter</span>
                </div>
                <span className="text-xs text-[var(--eva-green)]">✓ ACTIVE</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs">
                  <Facebook className="h-3 w-3 mr-2 text-[var(--eva-blue)]" />
                  <span>Facebook</span>
                </div>
                <span className="text-xs text-[var(--eva-green)]">✓ ACTIVE</span>
              </div>
            </div>
            
            {/* Copy URL */}
            <div className="flex items-center">
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-mono flex items-center text-[var(--eva-text)] mr-2 flex-1 justify-start border-[var(--eva-orange)]/30"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 mr-2 text-[var(--eva-green)]" />
                    COPIED!
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-2" />
                    COPY SITE URL
                  </>
                )}
              </Button>
              <Button
                size="sm" 
                variant="default"
                className="text-xs font-mono text-black bg-[var(--eva-orange)] hover:bg-[var(--eva-orange-dark)]"
                onClick={() => window.open('https://cards-dev.twitter.com/validator', '_blank')}
              >
                TEST CARD
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SocialPreview;