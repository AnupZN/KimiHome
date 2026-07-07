export interface Bookmark {
  id: string;
  title: string;
  url: string;
  category: string;
  color?: string;
  icon?: string; // Icon identifier
  iconUrl?: string; // Custom icon URL
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  category: string;
}

export interface QuickNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  forecast: Array<{
    day: string;
    temp: number;
    condition: string;
  }>;
}

export interface WidgetLayout {
  id: string;
  visible: boolean;
  order: number;
}

export interface UserSettings {
  userName: string;
  theme: 'light' | 'dark' | 'cosmic';
  bgType: 'gradient' | 'image' | 'solid';
  bgValue: string;
  searchEngine: 'google' | 'duckduckgo' | 'bing';
  enabledWidgets: {
    clock: boolean;
    search: boolean;
    bookmarks: boolean;
    weather: boolean;
    todo: boolean;
    notes: boolean;
    focus: boolean;
  };
  widgetOrder?: string[];
}
