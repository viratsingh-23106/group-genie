import React from 'react';
import GroupCreatorForm from '@/components/GroupCreatorForm';
import TelegramIcon from '@/components/TelegramIcon';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/3 to-transparent rounded-full" />
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="py-8 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent mb-6 shadow-lg shadow-primary/30 animate-float">
              <TelegramIcon size={40} className="text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 gradient-text">
              Telegram Group Creator
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Automatically create Telegram groups with multiple members using GramJS
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 pb-12">
          <div className="max-w-2xl mx-auto">
            <GroupCreatorForm />
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-4 border-t border-border/30">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm text-muted-foreground">
              Powered by{' '}
              <span className="text-primary font-medium">GramJS</span>
              {' '}• Secure & Fast
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
