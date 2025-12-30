import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ImagePlus, Send, Loader2, CheckCircle, AlertCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import TelegramIcon from './TelegramIcon';
import { supabase } from '@/integrations/supabase/client';

interface FormData {
  groupName: string;
  mobileNumbers: string;
  groupImage: File | null;
  phoneNumber: string;
}

const GroupCreatorForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    groupName: '',
    mobileNumbers: '',
    groupImage: null,
    phoneNumber: '',
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, groupImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    
    if (!formData.mobileNumbers.trim()) {
      toast.error('Please enter mobile numbers');
      return;
    }

    if (!formData.phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      // Parse mobile numbers
      const numbers = formData.mobileNumbers
        .split(/[\n,]+/)
        .map(n => n.trim())
        .filter(n => n.length > 0);

      if (numbers.length === 0) {
        throw new Error('No valid mobile numbers found');
      }

      // Convert image to base64 if provided
      let groupImageBase64: string | undefined;
      if (formData.groupImage) {
        groupImageBase64 = await fileToBase64(formData.groupImage);
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke('create-telegram-group', {
        body: {
          groupName: formData.groupName,
          mobileNumbers: numbers,
          phoneNumber: formData.phoneNumber,
          groupImageBase64,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create group');
      }
      
      setStatus('success');
      toast.success(`Group "${formData.groupName}" created with ${numbers.length} members!`);
      
      // Reset form (keep phone number)
      setFormData({
        groupName: '',
        mobileNumbers: '',
        groupImage: null,
        phoneNumber: formData.phoneNumber,
      });
      setImagePreview(null);
    } catch (error) {
      setStatus('error');
      toast.error(error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  const parsedNumbers = formData.mobileNumbers
    .split(/[\n,]+/)
    .map(n => n.trim())
    .filter(n => n.length > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Group Details Card */}
      <Card className="glass border-border/50 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TelegramIcon className="w-5 h-5 text-primary" />
            Group Details
          </CardTitle>
          <CardDescription>
            Enter the name and profile picture for your new Telegram group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image Upload */}
            <div className="flex-shrink-0">
              <Label className="text-sm font-medium text-foreground mb-2 block">
                Group Photo
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-dashed border-border/50 hover:border-primary/50 transition-all duration-300 cursor-pointer flex items-center justify-center overflow-hidden bg-secondary/50 hover:bg-secondary group"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Group preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImagePlus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            {/* Group Name */}
            <div className="flex-grow space-y-2">
              <Label htmlFor="groupName" className="text-sm font-medium text-foreground">
                Group Name
              </Label>
              <Input
                id="groupName"
                name="groupName"
                type="text"
                placeholder="Enter group name"
                value={formData.groupName}
                onChange={handleInputChange}
                className="bg-input border-border/50 focus:border-primary transition-colors text-lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Phone Number Card */}
      <Card className="glass border-border/50 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="w-5 h-5 text-primary" />
            Your Phone Number
          </CardTitle>
          <CardDescription>
            Enter your Telegram registered phone number with country code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            placeholder="+91XXXXXXXXXX"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            className="bg-input border-border/50 focus:border-primary transition-colors"
          />
        </CardContent>
      </Card>

      {/* Members Card */}
      <Card className="glass border-border/50 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Group Members
            {parsedNumbers.length > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                {parsedNumbers.length} number{parsedNumbers.length !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Paste mobile numbers (one per line or comma-separated)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            name="mobileNumbers"
            placeholder="+91XXXXXXXXXX&#10;+91XXXXXXXXXX&#10;+91XXXXXXXXXX"
            value={formData.mobileNumbers}
            onChange={handleInputChange}
            className="min-h-[160px] bg-input border-border/50 focus:border-primary transition-colors font-mono text-sm"
          />
          
          {/* Preview parsed numbers */}
          {parsedNumbers.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border/30">
              <p className="text-xs text-muted-foreground mb-2">Parsed numbers:</p>
              <div className="flex flex-wrap gap-2">
                {parsedNumbers.slice(0, 10).map((num, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20"
                  >
                    {num}
                  </span>
                ))}
                {parsedNumbers.length > 10 && (
                  <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                    +{parsedNumbers.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="telegram"
        size="xl"
        className="w-full animate-fade-in"
        style={{ animationDelay: '0.25s' }}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating Group...
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Group Created!
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle className="w-5 h-5" />
            Try Again
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Create Telegram Group
          </>
        )}
      </Button>
    </form>
  );
};

export default GroupCreatorForm;
