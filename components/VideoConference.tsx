"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Mic, Monitor, Video, VideoOff, MicOff, MonitorOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VideoConference() {
  const { toast } = useToast();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: isAudioOn 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
      setIsCameraOn(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access camera",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
    }
    setIsCameraOn(false);
  };

  const toggleAudio = async () => {
    try {
      if (!isAudioOn) {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = audioStream;
        if (streamRef.current) {
          streamRef.current = new MediaStream([
            ...streamRef.current.getTracks(),
            ...audioStream.getTracks()
          ]);
        } else {
          streamRef.current = audioStream;
        }
      } else {
        audioStreamRef.current?.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
        if (streamRef.current) {
          streamRef.current = new MediaStream(
            streamRef.current.getTracks().filter(track => track.kind !== "audio")
          );
        }
      }
      setIsAudioOn(!isAudioOn);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle audio",
        variant: "destructive",
      });
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true 
        });
        screenStreamRef.current = screenStream;
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
      } else {
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        screenStreamRef.current = null;
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle screen sharing",
        variant: "destructive",
      });
    }
  };

  const startRecording = useCallback(() => {
    recordedChunksRef.current = [];
    
    let recordingStream: MediaStream;
    
    if (screenStreamRef.current) {
      // Create a new stream that combines screen sharing and audio
      const tracks = [...screenStreamRef.current.getTracks()];
      if (isAudioOn && audioStreamRef.current) {
        tracks.push(...audioStreamRef.current.getAudioTracks());
      }
      recordingStream = new MediaStream(tracks);
    } else if (streamRef.current) {
      recordingStream = streamRef.current;
    } else {
      toast({
        title: "Error",
        description: "No stream available to record",
        variant: "destructive",
      });
      return;
    }

    const mediaRecorder = new MediaRecorder(recordingStream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: "video/webm"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style.display = "none";
      a.href = url;
      a.download = `recording-${new Date().toISOString()}.webm`;
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    };

    mediaRecorder.start();
    setIsRecording(true);
  }, [isAudioOn, toast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={() => isCameraOn ? stopCamera() : startCamera()}
        >
          {isCameraOn ? (
            <>
              <VideoOff className="mr-2 h-5 w-5" />
              Disable Camera
            </>
          ) : (
            <>
              <Camera className="mr-2 h-5 w-5" />
              Enable Camera
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={toggleAudio}
        >
          {isAudioOn ? (
            <>
              <MicOff className="mr-2 h-5 w-5" />
              Disable Audio
            </>
          ) : (
            <>
              <Mic className="mr-2 h-5 w-5" />
              Enable Audio
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={toggleScreenShare}
        >
          {isScreenSharing ? (
            <>
              <MonitorOff className="mr-2 h-5 w-5" />
              Stop Sharing
            </>
          ) : (
            <>
              <Monitor className="mr-2 h-5 w-5" />
              Share Screen
            </>
          )}
        </Button>

        <Button
          variant={isRecording ? "destructive" : "default"}
          size="lg"
          onClick={() => isRecording ? stopRecording() : startRecording()}
        >
          <Video className="mr-2 h-5 w-5" />
          {isRecording ? "Stop Recording" : "Start Recording"}
        </Button>
      </div>
    </div>
  );
}