import { useState, useEffect, memo } from 'react';
import { Edit2, Check } from 'lucide-react';

interface ClockWidgetProps {
  userName: string;
  onNameChange: (name: string) => void;
}

const ClockWidget = memo(function ClockWidget({ userName, onNameChange }: ClockWidgetProps) {
  const [time, setTime] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [use24Hour, setUse24Hour] = useState(() => {
    const saved = localStorage.getItem('use24Hour');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTimeFormat = () => {
    const newVal = !use24Hour;
    setUse24Hour(newVal);
    localStorage.setItem('use24Hour', JSON.stringify(newVal));
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      onNameChange(tempName.trim());
    } else {
      setTempName(userName);
    }
    setIsEditing(false);
  };

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatTime = () => {
    const hours = time.getHours();
    const minutes = time.getMinutes().toString().padStart(2, '0');
    
    if (use24Hour) {
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    } else {
      const displayHours = hours % 12 || 12;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      return `${displayHours}:${minutes} ${ampm}`;
    }
  };

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return time.toLocaleDateString(undefined, options);
  };

  return (
    <div className="text-center py-6 select-none" id="clock-widget-container">
      {/* Time Display */}
      <h1 
        onClick={toggleTimeFormat}
        className="font-display text-5xl md:text-7xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all duration-150 inline-block"
        title="Click to toggle 12/24 hour format"
        id="clock-time-display"
      >
        {formatTime()}
      </h1>

      {/* Date Display */}
      <p className="text-sm md:text-base font-medium text-neutral-500 dark:text-neutral-400 mt-2 tracking-wide" id="clock-date-display">
        {formatDate()}
      </p>

      {/* Personalized Greeting */}
      <div className="flex items-center justify-center gap-2 mt-4 group" id="clock-greeting-container">
        {isEditing ? (
          <div className="flex items-center gap-1 bg-white dark:bg-elegant-card px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-elegant-border">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              onBlur={handleSaveName}
              className="bg-transparent border-none outline-none text-neutral-800 dark:text-neutral-100 font-semibold text-lg md:text-xl w-32 md:w-48 focus:ring-0 p-0"
              autoFocus
              id="username-edit-input"
            />
            <button 
              onClick={handleSaveName} 
              className="text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
              id="save-username-btn"
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-semibold text-neutral-800 dark:text-neutral-100 font-sans">
              {getGreeting()}, <span 
                onClick={() => {
                  setTempName(userName);
                  setIsEditing(true);
                }}
                className="cursor-pointer border-b-2 border-dotted border-neutral-400 dark:border-neutral-500 hover:text-neutral-600 dark:hover:text-white transition-colors"
                id="username-display-span"
              >
                {userName || 'Guest'}
              </span>
            </h2>
            <button
              onClick={() => {
                setTempName(userName);
                setIsEditing(true);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-elegant-border transition-all cursor-pointer"
              title="Edit Name"
              id="edit-username-btn"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default ClockWidget;
