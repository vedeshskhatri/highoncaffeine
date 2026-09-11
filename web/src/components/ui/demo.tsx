"use client";

import React, { useState } from "react";
import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";

export default function VoicePoweredOrbPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceDetected, setVoiceDetected] = useState(false);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="flex flex-col items-center space-y-8">
        {/* Orb */}
        <div className="w-96 h-96 relative">
          <VoicePoweredOrb
            enableVoiceControl={isRecording}
            className="rounded-xl overflow-hidden shadow-2xl"
            onVoiceDetected={setVoiceDetected}
          />
        </div>

        {/* Control Button */}
        <Button
          onClick={toggleRecording}
          variant={isRecording ? "destructive" : "default"}
          size="lg"
          className="px-8 py-3"
        >
          {isRecording ? (
            <>
              <MicOff className="w-5 h-5 mr-3" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="w-5 h-5 mr-3" />
              Start Recording
            </>
          )}
        </Button>

        {/* Simple Instructions */}
        <p className="text-muted-foreground text-center max-w-md">
          Click the button to enable voice control. Speak to see the orb respond to your voice with subtle movements.
        </p>
      </div>
    </div>
  );
}
