import { useState, useEffect, FormEvent } from 'react';
import { 
  Sun, Moon, Cloud, CloudRain, CloudSnow, CloudLightning, 
  CloudDrizzle, CloudFog, Wind, Droplets, Navigation, Search, RefreshCw, X
} from 'lucide-react';
import { WeatherData } from '../types';

// Map WMO weather codes to beautiful conditions, icons and text
function getWeatherCondition(code: number, isDay: boolean = true) {
  if (code === 0) {
    return {
      text: 'Clear Sky',
      icon: isDay ? Sun : Moon,
      color: 'text-amber-500 dark:text-amber-400',
    };
  }
  if (code >= 1 && code <= 3) {
    return {
      text: code === 1 ? 'Mainly Clear' : code === 2 ? 'Partly Cloudy' : 'Overcast',
      icon: Cloud,
      color: 'text-blue-400 dark:text-blue-300',
    };
  }
  if (code === 45 || code === 48) {
    return {
      text: 'Foggy',
      icon: CloudFog,
      color: 'text-neutral-400 dark:text-neutral-500',
    };
  }
  if (code >= 51 && code <= 55) {
    return {
      text: 'Drizzle',
      icon: CloudDrizzle,
      color: 'text-teal-400 dark:text-teal-300',
    };
  }
  if (code >= 61 && code <= 65) {
    return {
      text: 'Rainy',
      icon: CloudRain,
      color: 'text-blue-500 dark:text-blue-400',
    };
  }
  if (code >= 71 && code <= 75) {
    return {
      text: 'Snowy',
      icon: CloudSnow,
      color: 'text-sky-300 dark:text-sky-200',
    };
  }
  if (code >= 80 && code <= 82) {
    return {
      text: 'Showers',
      icon: CloudRain,
      color: 'text-blue-600 dark:text-blue-500',
    };
  }
  if (code >= 95 && code <= 99) {
    return {
      text: 'Thunderstorm',
      icon: CloudLightning,
      color: 'text-violet-500 dark:text-violet-400',
    };
  }
  return {
    text: 'Cloudy',
    icon: Cloud,
    color: 'text-neutral-400 dark:text-neutral-300',
  };
}

export default function WeatherWidget() {
  const [city, setCity] = useState(() => localStorage.getItem('weatherCity') || 'New York');
  const [lat, setLat] = useState(() => parseFloat(localStorage.getItem('weatherLat') || '40.7128'));
  const [lon, setLon] = useState(() => parseFloat(localStorage.getItem('weatherLon') || '-74.0060'));
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Fetch weather based on current lat and lon with local caching
  const fetchWeather = async (targetLat: number, targetLon: number, cityName: string, forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);

    const cacheKey = `weather_cache_${targetLat.toFixed(4)}_${targetLon.toFixed(4)}_${cityName}`;
    const cachedItem = localStorage.getItem(cacheKey);
    const EXPIRY_TIME = 15 * 60 * 1000; // 15 minutes

    if (!forceRefresh && cachedItem) {
      try {
        const { timestamp, data } = JSON.parse(cachedItem);
        if (Date.now() - timestamp < EXPIRY_TIME) {
          setWeather(data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Failed to parse cached weather', err);
      }
    }

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      if (!response.ok) throw new Error('Failed to load weather data');
      const data = await response.json();

      const current = data.current;
      const daily = data.daily;
      const conditionInfo = getWeatherCondition(current.weather_code, current.is_day === 1);

      // Create forecast list for next 5 days
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const forecast = [];
      for (let i = 1; i < 6; i++) {
        const dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + i);
        const dayName = days[dateObj.getDay()];
        const forecastCondition = getWeatherCondition(daily.weather_code[i], true);
        
        forecast.push({
          day: dayName,
          temp: Math.round((daily.temperature_2m_max[i] + daily.temperature_2m_min[i]) / 2),
          condition: forecastCondition.text,
        });
      }

      const weatherResult: WeatherData = {
        city: cityName,
        temp: Math.round(current.temperature_2m),
        condition: conditionInfo.text,
        tempMax: Math.round(daily.temperature_2m_max[0]),
        tempMin: Math.round(daily.temperature_2m_min[0]),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        forecast,
      };

      setWeather(weatherResult);
      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: weatherResult
      }));

      // Save coords/city to localStorage
      localStorage.setItem('weatherCity', cityName);
      localStorage.setItem('weatherLat', targetLat.toString());
      localStorage.setItem('weatherLon', targetLon.toString());
    } catch (err: any) {
      console.error(err);
      setError('Weather API error. Showing simulated data.');
      // Fallback with realistic simulated data for nice UX
      setWeather({
        city: cityName,
        temp: 22,
        condition: 'Partly Cloudy',
        tempMax: 26,
        tempMin: 16,
        humidity: 62,
        windSpeed: 12,
        forecast: [
          { day: 'Wed', temp: 24, condition: 'Clear Sky' },
          { day: 'Thu', temp: 23, condition: 'Partly Cloudy' },
          { day: 'Fri', temp: 19, condition: 'Rainy' },
          { day: 'Sat', temp: 21, condition: 'Clear Sky' },
          { day: 'Sun', temp: 22, condition: 'Partly Cloudy' },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(lat, lon, city);
  }, [lat, lon, city]);


  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchInput.trim())}&count=1&language=en&format=json`
      );
      if (!geoResponse.ok) throw new Error('Geocoding service error');
      const geoData = await geoResponse.json();

      if (!geoData.results || geoData.results.length === 0) {
        setError('Location not found. Please try another city.');
        setLoading(false);
        return;
      }

      const result = geoData.results[0];
      const newCityName = `${result.name}, ${result.country_code.toUpperCase()}`;
      setCity(newCityName);
      setLat(result.latitude);
      setLon(result.longitude);
      setSearchInput('');
      setIsSearching(false);
    } catch (err) {
      console.error(err);
      setError('Failed to find city. Network issue.');
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          
          try {
            // Reverse geocode or just set local coords and call weather
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            let detectedCity = 'Current Location';
            if (response.ok) {
              const resData = await response.json();
              detectedCity = resData.address.city || resData.address.town || resData.address.suburb || 'Local Area';
            }
            setCity(detectedCity);
            setLat(latitude);
            setLon(longitude);
          } catch {
            setCity('Local Weather');
            setLat(latitude);
            setLon(longitude);
          }
        },
        () => {
          setError('Location permission denied or unavailable.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  // Get active weather icon
  const WeatherIconComp = weather ? (getWeatherCondition(weather.tempMax > 28 ? 0 : 2, true).icon) : Sun;

  return (
    <div className="bg-white dark:bg-elegant-card rounded-3xl p-6 border border-neutral-200 dark:border-elegant-border hover:dark:border-elegant-border-hover transition-all duration-300 shadow-sm flex flex-col justify-between h-full" id="weather-widget">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {isSearching ? (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full animate-in slide-in-from-top-1 duration-150">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter city..."
              className="flex-1 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-elegant-border bg-white dark:bg-elegant-card-darker text-neutral-800 dark:text-neutral-100 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50"
              autoFocus
              id="weather-search-input"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-xs cursor-pointer"
            >
              Go
            </button>
            <button
              type="button"
              onClick={() => setIsSearching(false)}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between w-full">
            <h3 className="font-display font-semibold text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
              <Navigation className="w-4 h-4" />
              {city}
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSearching(true)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-elegant-border text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                title="Search City"
                id="search-city-btn"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleUseCurrentLocation}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-elegant-border text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
                title="Use GPS Location"
                id="gps-location-btn"
              >
                <Navigation className="w-3.5 h-3.5 rotate-45" />
              </button>
              <button
                onClick={() => fetchWeather(lat, lon, city, true)}
                className={`p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-elegant-border text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer ${loading ? 'animate-spin' : ''}`}
                title="Refresh"
                id="refresh-weather-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-[10px] text-rose-500 mb-2 font-medium" id="weather-error-msg">
          {error}
        </div>
      )}

      {/* Main Temp display */}
      {weather && (
        <div className="flex items-center justify-between py-2" id="weather-info-body">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-neutral-100 dark:bg-elegant-card-darker rounded-2xl border border-neutral-200/40 dark:border-elegant-border">
              <WeatherIconComp className="w-10 h-10 text-amber-500 dark:text-amber-400" />
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-4xl md:text-5xl font-display font-bold text-neutral-900 dark:text-white">
                  {weather.temp}°
                </span>
                <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 ml-1">
                  C
                </span>
              </div>
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 capitalize">
                {weather.condition}
              </span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 flex items-center justify-end gap-1">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
              <span>{weather.humidity}% Hum</span>
            </div>
            <div className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 flex items-center justify-end gap-1">
              <Wind className="w-3.5 h-3.5 text-teal-400" />
              <span>{weather.windSpeed} km/h</span>
            </div>
            <div className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
              L: {weather.tempMin}° • H: {weather.tempMax}°
            </div>
          </div>
        </div>
      )}

      {/* 5-day forecast */}
      {weather && (
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-elegant-border grid grid-cols-5 gap-1.5 text-center" id="weather-forecast-grid">
          {weather.forecast.map((f, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">
                {f.day}
              </span>
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1">
                {f.temp}°
              </span>
              <span className="text-[9px] text-neutral-400 dark:text-neutral-500 capitalize truncate max-w-full mt-0.5">
                {f.condition.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
