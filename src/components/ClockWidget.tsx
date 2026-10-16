import { useState, useEffect, memo } from 'react';

const ClockWidget = memo(function ClockWidget() {
  const [time, setTime] = useState(new Date());
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
    </div>
  );
});

export default ClockWidget;
