import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ImagePlus, Send, Loader2, CheckCircle, AlertCircle, Phone, KeyRound, MessageSquare, Settings, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import TelegramIcon from './TelegramIcon';

type Step = 'setup' | 'phone' | 'otp' | 'group';

interface FormData {
  groupName: string;
  mobileNumbers: string;
  groupImage: File | null;
  phoneNumber: string;
  otpCode: string;
  backendUrl: string;
}

const GroupCreatorForm: React.FC = () => {
  const [step, setStep] = useState<Step>('setup');
  const [formData, setFormData] = useState<FormData>({
    groupName: '',
    mobileNumbers: '',
    groupImage: null,
    phoneNumber: '',
    otpCode: '',
    backendUrl: localStorage.getItem('telegram_backend_url') || '',
  });
  const [phoneCodeHash, setPhoneCodeHash] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [sessionString, setSessionString] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if backend URL is already saved
    const savedUrl = localStorage.getItem('telegram_backend_url');
    if (savedUrl) {
      setFormData(prev => ({ ...prev, backendUrl: savedUrl }));
      setStep('phone');
    }
  }, []);

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

  const handleSaveBackendUrl = () => {
    if (!formData.backendUrl.trim()) {
      toast.error('Please enter your backend URL');
      return;
    }
    localStorage.setItem('telegram_backend_url', formData.backendUrl.trim());
    toast.success('Backend URL saved!');
    setStep('phone');
  };

  // Step 1: Send OTP
  const handleSendCode = async () => {
    if (!formData.phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${formData.backendUrl}/api/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formData.phoneNumber.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setPhoneCodeHash(data.phoneCodeHash);
      setClientId(data.clientId);
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
      const response = await fetch(`${formData.backendUrl}/api/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber.trim(),
          phoneCodeHash: phoneCodeHash,
          code: formData.otpCode.trim(),
          clientId: clientId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

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

      const response = await fetch(`${formData.backendUrl}/api/create-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionString: sessionString,
          groupName: formData.groupName,
          mobileNumbers: numbers,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create group');
      }
      
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

  const getStepIndex = () => {
    const steps = ['setup', 'phone', 'otp', 'group'];
    return steps.indexOf(step);
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      {step !== 'setup' && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((num, idx) => (
            <React.Fragment key={num}>
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  getStepIndex() > idx 
                    ? 'bg-primary/20 text-primary'
                    : getStepIndex() === idx + 1
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                      : 'bg-secondary text-muted-foreground'
                }`}
              >
                {num}
              </div>
              {idx < 2 && (
                <div className={`w-12 h-1 rounded ${
                  getStepIndex() > idx + 1 ? 'bg-primary' : 'bg-secondary'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Step 0: Backend Setup */}
      {step === 'setup' && (
        <Card className="glass border-border/50 animate-fade-in">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5 text-primary" />
              Backend Server Setup
            </CardTitle>
            <CardDescription>
              Enter your Node.js backend URL where GramJS is running
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm">
              <p className="font-medium text-primary mb-2">📋 Quick Setup Guide:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Download the <code className="bg-secondary px-1 rounded">nodejs-backend</code> folder from this project</li>
                <li>Deploy to Railway, Render, or your own VPS</li>
                <li>Set <code className="bg-secondary px-1 rounded">TELEGRAM_API_ID</code> and <code className="bg-secondary px-1 rounded">TELEGRAM_API_HASH</code> env variables</li>
                <li>Paste your deployment URL below</li>
              </ol>
            </div>
            
            <Input
              name="backendUrl"
              type="url"
              placeholder="https://your-backend.railway.app"
              value={formData.backendUrl}
              onChange={handleInputChange}
              className="bg-input border-border/50 focus:border-primary transition-colors"
            />
            
            <Button
              onClick={handleSaveBackendUrl}
              variant="telegram"
              size="lg"
              className="w-full"
            >
              <ExternalLink className="w-5 h-5" />
              Connect to Backend
            </Button>
          </CardContent>
        </Card>
      )}

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
            <Button
              onClick={() => setStep('setup')}
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
            >
              <Settings className="w-4 h-4 mr-2" />
              Change Backend URL
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