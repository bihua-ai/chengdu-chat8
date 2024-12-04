import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import WaveSurfer from 'wavesurfer.js';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onSendMessage?: (blob: Blob) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function VoiceRecorder({ 
  onRecordingComplete, 
  onSendMessage,
  disabled = false,
  compact = false 
}: VoiceRecorderProps) {
  const { language } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const waveformRef = useRef<WaveSurfer>();
  const waveformContainerRef = useRef<HTMLDivElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        setIsProcessing(true);

        try {
          if (waveformContainerRef.current) {
            waveformRef.current = WaveSurfer.create({
              container: waveformContainerRef.current,
              waveColor: '#4ADE80',
              progressColor: '#22C55E',
              height: 30,
              cursorWidth: 0,
              barWidth: 2,
              barGap: 1,
            });
            
            waveformRef.current.loadBlob(blob);
            waveformRef.current.on('ready', () => {
              setIsProcessing(false);
            });

            waveformRef.current.on('finish', () => {
              setIsPlaying(false);
            });
          }
        } catch (err) {
          console.error('Error creating waveform:', err);
          setIsProcessing(false);
        }
        
        onRecordingComplete(blob);
        if (onSendMessage) {
          onSendMessage(blob);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingTime(0);
      
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const togglePlayback = () => {
    if (waveformRef.current) {
      if (isPlaying) {
        waveformRef.current.pause();
      } else {
        waveformRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const resetRecorder = () => {
    setAudioBlob(null);
    setIsProcessing(false);
    setRecordingTime(0);
    setIsPlaying(false);
    setIsRecording(false);
    if (waveformRef.current) {
      waveformRef.current.destroy();
    }
  };

  useEffect(() => {
    return () => {
      if (waveformRef.current) {
        waveformRef.current.destroy();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      {!audioBlob ? (
        <>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            title={language === 'en' ? 'Record voice message' : '录制语音消息'}
            className={`p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : disabled
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isRecording ? (
              <Square className={compact ? "h-4 w-4" : "h-5 w-5"} />
            ) : (
              <Mic className={compact ? "h-4 w-4" : "h-5 w-5"} />
            )}
          </button>
          {isRecording && (
            <span className="text-sm text-gray-600">
              {formatTime(recordingTime)}
            </span>
          )}
        </>
      ) : (
        <>
          {isProcessing ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className={`animate-spin ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
              <span className="text-sm">
                {language === 'en' ? 'Processing...' : '处理中...'}
              </span>
            </div>
          ) : (
            <>
              <button
                onClick={togglePlayback}
                className="p-1.5 text-green-600 hover:text-green-700 focus:outline-none"
              >
                {isPlaying ? (
                  <Square className={compact ? "h-4 w-4" : "h-5 w-5"} />
                ) : (
                  <Play className={compact ? "h-4 w-4" : "h-5 w-5"} />
                )}
              </button>
              <div ref={waveformContainerRef} className="flex-1 min-w-[100px]" />
            </>
          )}
          <button
            onClick={resetRecorder}
            className="p-1.5 text-red-600 hover:text-red-700 focus:outline-none"
            title={language === 'en' ? 'Reset recorder' : '重置录音'}
          >
            <Square className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </button>
        </>
      )}
    </div>
  );
}