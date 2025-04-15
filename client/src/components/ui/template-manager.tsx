import { FC, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SavedTemplate, saveTemplate, getTemplates, deleteTemplate } from '@/utils/settings-storage';
import { Trash2, Save, Plus, FileText, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TemplateManagerProps {
  currentPrompt: string;
  currentTemplate: string;
  onSelectTemplate: (template: SavedTemplate) => void;
}

const TemplateManager: FC<TemplateManagerProps> = ({
  currentPrompt,
  currentTemplate,
  onSelectTemplate
}) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<SavedTemplate[]>(() => getTemplates());
  const [isOpen, setIsOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  
  const loadTemplates = () => {
    setTemplates(getTemplates());
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadTemplates();
    }
  };
  
  const handleDelete = (id: string) => {
    if (deleteTemplate(id)) {
      loadTemplates();
      toast({
        title: 'Template Deleted',
        description: 'The template has been removed.'
      });
    }
  };
  
  const handleSelect = (template: SavedTemplate) => {
    onSelectTemplate(template);
    setIsOpen(false);
    toast({
      title: 'Template Loaded',
      description: `Loaded template: ${template.name}`
    });
  };
  
  const handleSave = () => {
    if (!templateName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please provide a name for your template.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const newTemplate = saveTemplate({
        name: templateName,
        prompt: currentPrompt,
        template: currentTemplate
      });
      
      setIsSaveDialogOpen(false);
      setTemplateName('');
      
      toast({
        title: 'Template Saved',
        description: 'Your template has been saved successfully.'
      });
      
      // If main dialog is open, refresh the list
      if (isOpen) {
        loadTemplates();
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Failed to save the template. Please try again.',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" className="eva-button border-[var(--eva-orange)] text-[var(--eva-orange)]">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md bg-black border-[var(--eva-orange)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--eva-orange)]">Template Manager</DialogTitle>
            <DialogDescription className="text-[var(--eva-text)]">
              Save and load your prompt and evaluation templates.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {templates.length === 0 ? (
              <div className="text-center py-8 bg-black/30 rounded-md">
                <AlertCircle className="h-10 w-10 mx-auto text-[var(--eva-orange)] opacity-50 mb-2" />
                <p className="text-[var(--eva-text)]">No saved templates yet.</p>
                <p className="text-xs text-[var(--eva-text)] mt-1">
                  Save your current prompt and template to reuse them later.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] rounded-md border border-[var(--eva-orange)]/20 p-2">
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-black/30 group bg-black/10"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <h4 className="font-medium text-[var(--eva-green)] truncate">{template.name}</h4>
                        <p className="text-xs text-[var(--eva-text)] truncate">
                          {new Date(template.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-[var(--eva-text)] truncate">{template.prompt.substring(0, 50)}{template.prompt.length > 50 ? '...' : ''}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 p-0 w-8 rounded-full bg-[var(--eva-green-bg)] border-[var(--eva-green)]"
                          onClick={() => handleSelect(template)}
                        >
                          <Check className="h-4 w-4 text-[var(--eva-green)]" />
                          <span className="sr-only">Load</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 p-0 w-8 rounded-full bg-[var(--eva-red-bg)] border-[var(--eva-red)]"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-[var(--eva-red)]" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <DialogFooter className="flex flex-row sm:justify-between">
            <Button
              type="button" 
              variant="outline"
              className="eva-button border-[var(--eva-orange)] text-[var(--eva-orange)]"
              onClick={() => {
                setIsOpen(false);
                setIsSaveDialogOpen(true);
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Current
            </Button>
            
            <Button
              type="button"
              onClick={() => setIsOpen(false)}
              className="eva-button bg-[var(--eva-orange)] text-black"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md bg-black border-[var(--eva-orange)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--eva-orange)]">Save Template</DialogTitle>
            <DialogDescription className="text-[var(--eva-text)]">
              Give your template a descriptive name.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Label htmlFor="template-name" className="text-[var(--eva-text)]">
              Template Name
            </Label>
            <Input
              id="template-name"
              placeholder="My Awesome Template"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="eva-input text-[var(--eva-green)]"
            />
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
              className="eva-button border-[var(--eva-orange)] text-[var(--eva-orange)]"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSave}
              className="eva-button bg-[var(--eva-orange)] text-black"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Quick Save Button */}
      <Button
        variant="outline"
        className="eva-button border-[var(--eva-orange)] text-[var(--eva-orange)]"
        onClick={() => setIsSaveDialogOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Save New
      </Button>
    </>
  );
};

export default TemplateManager;