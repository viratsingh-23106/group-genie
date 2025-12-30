import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ImagePlus, Send, Loader2, CheckCircle, AlertCircle, Phone, KeyRound, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import TelegramIcon from './TelegramIcon';
import { supabase } from '@/integrations/supabase/client';

type Step = 'phone' | 'otp' | 'group';

interface FormData {
  groupName: string;
  mobileNumbers: string;
  groupImage: File | null;
  phoneNumber: string;
  otpCode: string;
}

const GroupCreatorForm: React.FC = () => {
  const [step, setStep] = useState<Step>('phone');
  const [formData, setFormData] = useState<FormData>({
    groupName: '',
    mobileNumbers: '',
    groupImage: null,
    phoneNumber: '',
    otpCode: '',
  });
  const [phoneCodeHash, setPhoneCodeHash] = useState<string>('');
  const [sessionString, setSessionString] = useState<string>('');
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

  // Step 1: Send OTP
  const handleSendCode = async () => {
    if (!formData.phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-telegram-group', {
        body: {
          action: 'send_code',
          phoneNumber: formData.phoneNumber.trim(),
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error);

      setPhoneCodeHash(data.phoneCodeHash);
      setStep('otp');
      toast.success('OTP sent to your Telegram!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyCode = async () => {
    if (!formData.otpCode.trim()) {
      toast.error('Please enter the OTP code');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-telegram-group', {
        body: {
          action: 'verify_code',
          phoneNumber: formData.phoneNumber.trim(),
          phoneCodeHash: phoneCodeHash,
          code: formData.otpCode.trim(),
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error);

      setSessionString(data.sessionString);
      setStep('group');
      toast.success('Authenticated successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Create Group
  const handleCreateGroup = async () => {
    if (!formData.groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    
    if (!formData.mobileNumbers.trim()) {
      toast.error('Please enter mobile numbers');
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      const numbers = formData.mobileNumbers
        .split(/[\n,]+/)
        .map(n => n.trim())
        .filter(n => n.length > 0);

      if (numbers.length === 0) {
        throw new Error('No valid mobile numbers found');
      }

      let groupImageBase64: string | undefined;
      if (formData.groupImage) {
        groupImageBase64 = await fileToBase64(formData.groupImage);
      }

      const { data, error } = await supabase.functions.invoke('create-telegram-group', {
        body: {
          action: 'create_group',
          sessionString: sessionString,
          groupName: formData.groupName,
          mobileNumbers: numbers,
          groupImageBase64,
        },
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error);
      
      setStatus('success');
      toast.success(data.message);
      
      // Reset form for next group
      setFormData(prev => ({
        ...prev,
        groupName: '',
        mobileNumbers: '',
        groupImage: null,
      }));
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
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {['phone', 'otp', 'group'].map((s, idx) => (
          <React.Fragment key={s}>
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step === s 
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                  : idx < ['phone', 'otp', 'group'].indexOf(step)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground'
              }`}
            >
              {idx + 1}
            </div>
            {idx < 2 && (
              <div className={`w-12 h-1 rounded ${
                idx < ['phone', 'otp', 'group'].indexOf(step) ? 'bg-primary' : 'bg-secondary'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Phone Number */}
      {step === 'phone' && (
        <Card className="glass border-border/50 animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="w-5 h-5 text-primary" />
              Login to Telegram
            </CardTitle>
            <CardDescription>
              Enter your Telegram registered phone number to receive OTP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              name="phoneNumber"
              type="tel"
              placeholder="+91XXXXXXXXXX"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className="bg-input border-border/50 focus:border-primary transition-colors text-lg"
            />
            <Button
              onClick={handleSendCode}
              variant="telegram"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send OTP
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: OTP Verification */}
      {step === 'otp' && (
        <Card className="glass border-border/50 animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="w-5 h-5 text-primary" />
              Verify OTP
            </CardTitle>
            <CardDescription>
              Enter the code sent to your Telegram app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              name="otpCode"
              type="text"
              placeholder="Enter OTP code"
              value={formData.otpCode}
              onChange={handleInputChange}
              className="bg-input border-border/50 focus:border-primary transition-colors text-lg text-center tracking-widest"
              maxLength={6}
            />
            <Button
              onClick={handleVerifyCode}
              variant="telegram"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Verify & Continue
                </>
              )}
            </Button>
            <Button
              onClick={() => setStep('phone')}
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
            >
              Change phone number
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Create Group */}
      {step === 'group' && (
        <form onSubmit={(e) => { e.preventDefault(); handleCreateGroup(); }} className="space-y-6">
          {/* Success Badge */}
          <div className="flex items-center justify-center gap-2 text-sm text-primary bg-primary/10 px-4 py-2 rounded-full w-fit mx-auto">
            <CheckCircle className="w-4 h-4" />
            Logged in as {formData.phoneNumber}
          </div>

          {/* Group Details Card */}
          <Card className="glass border-border/50 animate-fade-in">
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

          {/* Members Card */}
          <Card className="glass border-border/50 animate-fade-in">
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
                placeholder={"+91XXXXXXXXXX\n+91XXXXXXXXXX\n+91XXXXXXXXXX"}
                value={formData.mobileNumbers}
                onChange={handleInputChange}
                className="min-h-[160px] bg-input border-border/50 focus:border-primary transition-colors font-mono text-sm"
              />
              
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
            className="w-full"
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
                <MessageSquare className="w-5 h-5" />
                Create Telegram Group
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
};

export default GroupCreatorForm;