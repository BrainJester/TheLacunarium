import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScrollText } from 'lucide-react';

export default function GameLog({ log }) {
  return (
    <div className="bg-transparent border border-white/30 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <ScrollText className="w-3.5 h-3.5 text-muted-foreground" />
        <h3 className="font-casino font-semibold text-xs text-white/60 uppercase tracking-widest">LOG</h3>
      </div>
      <ScrollArea className="h-32">
        <div className="space-y-0.5 text-xs font-body text-white/70 pr-3">
          {log.map((entry, i) => (
            <div key={i} className="leading-relaxed">
              {entry}
            </div>
          ))}

        </div>
      </ScrollArea>
    </div>
  );
}