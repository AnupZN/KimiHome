import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Award, Sliders, Check, X } from 'lucide-react';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const MODE_CONFIGS = {
  work: {
    label: 'Focus Session',
    color: 'from-rose-400 to-orange-500',
    ring: 'border-rose-500/20',
  },
  shortBreak: {
    label: 'Short Break',
    color: 'from-emerald-400 to-teal-500',
    ring: 'border-emerald-500/20',
  },
  longBreak: {
    label: 'Long Break',
    color: 'from-blue-400 to-indigo-500',
    ring: 'border-blue-500/20',
  },
};

export default function FocusWidget() {
  const [customDurations, setCustomDurations] = useState<{ work: number; shortBreak: number; longBreak: number }>(() => {
    const saved = localStorage.getItem('focusCustomDurations');
    return saved ? JSON.parse(saved) : { work: 25, shortBreak: 5, longBreak: 15 };
  });

  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem('focusCustomDurations');
    const durations = saved ? JSON.parse(saved) : { work: 25, shortBreak: 5, longBreak: 15 };
    return durations.work * 60;
  });
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    const saved = localStorage.getItem('focusSessionsCount');
    return saved ? parseInt(saved) : 0;
  });
  const [showSettings, setShowSettings] = useState(false);

  // Settings adjustments
  const [tempWork, setTempWork] = useState(customDurations.work);
  const [tempShort, setTempShort] = useState(customDurations.shortBreak);
  const [tempLong, setTempLong] = useState(customDurations.longBreak);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update temp state when sliders open
  useEffect(() => {
    if (showSettings) {
      setTempWork(customDurations.work);
      setTempShort(customDurations.shortBreak);
      setTempLong(customDurations.longBreak);
    }
  }, [showSettings, customDurations]);

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
        setTimeLeft(customDurations.shortBreak * 60);
      } else {
        setMode('work');
        setTimeLeft(customDurations.work * 60);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode, customDurations, sessionsCompleted]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(customDurations[mode] * 60);
  };

  const handleModeChange = (newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(customDurations[newMode] * 60);
  };

  const handleSaveDurations = () => {
    const updated = {
      work: Math.max(1, tempWork),
      shortBreak: Math.max(1, tempShort),
      longBreak: Math.max(1, tempLong),
    };
    setCustomDurations(updated);
    localStorage.setItem('focusCustomDurations', JSON.stringify(updated));
    
    // Apply changes to the active timer
    setIsActive(false);
    setTimeLeft(updated[mode] * 60);
    setShowSettings(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const config = MODE_CONFIGS[mode];
  const maxDuration = customDurations[mode] * 60;
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer ${
                showSettings ? 'bg-neutral-100 dark:bg-elegant-border text-neutral-800 dark:text-white' : ''
              }`}
              title="Configure Durations"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 dark:text-neutral-500">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>{sessionsCompleted} done today</span>
            </div>
          </div>
        </div>

        {showSettings ? (
          /* Inline Duration Settings Panel */
          <div className="space-y-4 py-2 animate-in fade-in slide-in-from-top-2 duration-200" id="focus-settings-panel">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                Custom Durations (Mins)
              </h4>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Work slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                  <span>Work block:</span>
                  <span className="font-mono text-rose-500 dark:text-rose-400 font-bold">{tempWork}m</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="90"
                  value={tempWork}
                  onChange={(e) => setTempWork(parseInt(e.target.value))}
                  className="w-full accent-rose-500 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none h-1.5"
                />
              </div>

              {/* Short Break slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                  <span>Short break:</span>
                  <span className="font-mono text-emerald-500 dark:text-emerald-400 font-bold">{tempShort}m</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={tempShort}
                  onChange={(e) => setTempShort(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none h-1.5"
                />
              </div>

              {/* Long Break slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                  <span>Long break:</span>
                  <span className="font-mono text-blue-500 dark:text-blue-400 font-bold">{tempLong}m</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="45"
                  value={tempLong}
                  onChange={(e) => setTempLong(parseInt(e.target.value))}
                  className="w-full accent-blue-500 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none h-1.5"
                />
              </div>
            </div>

            <button
              onClick={handleSaveDurations}
              className="w-full mt-2 py-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 justify-center shadow-sm"
            >
              <Check className="w-4 h-4" />
              Save & Apply
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Control Actions (Only show when not in settings) */}
      {!showSettings && (
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
      )}
    </div>
  );
}
