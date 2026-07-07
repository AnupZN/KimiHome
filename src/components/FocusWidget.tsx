import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Award, CheckCircle } from 'lucide-react';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const MODE_CONFIGS = {
  work: {
    label: 'Focus Session',
    duration: 25 * 60, // 25 minutes
    color: 'from-rose-400 to-orange-500',
    ring: 'border-rose-500/20',
  },
  shortBreak: {
    label: 'Short Break',
    duration: 5 * 60, // 5 minutes
    color: 'from-emerald-400 to-teal-500',
    ring: 'border-emerald-500/20',
  },
  longBreak: {
    label: 'Long Break',
    duration: 15 * 60, // 15 minutes
    color: 'from-blue-400 to-indigo-500',
    ring: 'border-blue-500/20',
  },
};

export default function FocusWidget() {
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(MODE_CONFIGS.work.duration);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    const saved = localStorage.getItem('focusSessionsCount');
    return saved ? parseInt(saved) : 0;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synthesize beep notification
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Tone 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.4);

      // Tone 2 (staggered slightly for a nice chime)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.5);
      }, 150);

    } catch (e) {
      console.warn('Audio Context is blocked or not supported', e);
    }
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      playBeep();
      setIsActive(false);
      
      if (mode === 'work') {
        const nextCount = sessionsCompleted + 1;
        setSessionsCompleted(nextCount);
        localStorage.setItem('focusSessionsCount', nextCount.toString());
        setMode('shortBreak');
        setTimeLeft(MODE_CONFIGS.shortBreak.duration);
      } else {
        setMode('work');
        setTimeLeft(MODE_CONFIGS.work.duration);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODE_CONFIGS[mode].duration);
  };

  const handleModeChange = (newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(MODE_CONFIGS[newMode].duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const config = MODE_CONFIGS[mode];
  const maxDuration = config.duration;
  const progressPercent = ((maxDuration - timeLeft) / maxDuration) * 100;

  return (
    <div className="bg-white dark:bg-elegant-card rounded-3xl p-5 sm:p-6 border border-neutral-200 dark:border-elegant-border hover:dark:border-elegant-border-hover transition-all duration-300 shadow-sm flex flex-col justify-between h-full min-h-[380px]" id="focus-widget">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-rose-500" />
            Focus Session
          </h3>
          <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 dark:text-neutral-500">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>{sessionsCompleted} done today</span>
          </div>
        </div>

        {/* Mode Select Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 dark:bg-elegant-card-darker rounded-xl mb-4 sm:mb-6" id="focus-tabs">
          {(['work', 'shortBreak', 'longBreak'] as const).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                mode === m
                  ? 'bg-white dark:bg-elegant-border text-neutral-800 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
              }`}
            >
              {m === 'work' ? 'Focus' : m === 'shortBreak' ? 'Short' : 'Long'}
            </button>
          ))}
        </div>

        {/* Display Timer Circle */}
        <div className="flex flex-col items-center justify-center my-2" id="focus-timer-body">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Outer Background Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-neutral-100 dark:stroke-neutral-800"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-rose-500 transition-all duration-300"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 64}
                strokeDashoffset={2 * Math.PI * 64 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                style={{
                  stroke: `url(#gradient-${mode})`,
                }}
              />
              <defs>
                <linearGradient id={`gradient-work`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id={`gradient-shortBreak`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
                <linearGradient id={`gradient-longBreak`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute text-center">
              <span className="font-display text-3xl font-bold text-neutral-800 dark:text-neutral-100 tracking-tight block">
                {formatTime(timeLeft)}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mt-0.5">
                {config.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex justify-center gap-3 border-t border-neutral-100 dark:border-elegant-border pt-4" id="focus-actions">
        <button
          onClick={resetTimer}
          className="p-2.5 rounded-2xl bg-neutral-100 dark:bg-elegant-card-darker hover:bg-neutral-200 dark:hover:bg-elegant-border text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          title="Reset"
          id="focus-reset-btn"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={toggleTimer}
          className={`px-6 py-2.5 rounded-2xl font-bold text-xs text-white shadow-md hover:shadow-lg transition-all cursor-pointer bg-gradient-to-r ${config.color}`}
          id="focus-toggle-btn"
        >
          <div className="flex items-center gap-1.5 justify-center">
            {isActive ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            <span>{isActive ? 'Pause' : 'Start Focus'}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
