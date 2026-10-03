export interface ScheduleConfig {
  enabled: boolean;
  onTime: string;
  offTime: string;
  preset: string; // 'all-night' | 'bedtime' | 'custom'
}

export interface AmbientConfig {
  enabled: boolean;
  currentLux: number; // 0 - 100%
  threshold: string; // 'pitch-black' | 'dusk' | 'dim' | 'slight'
  autoSwitch: boolean;
}

export interface NetworkConfig {
  status: string; // 'online' | 'connecting' | 'offline'
  type: string; // 'wifi' | 'bluetooth'
  ssid: string;
  ipAddress: string;
}

export interface LampState {
  power: boolean;
  brightness: number; // 0 - 100
  color: string; // Hex color
  mode: 'manual' | 'schedule' | 'ambient';
  schedule: ScheduleConfig;
  ambient: AmbientConfig;
  network: NetworkConfig;
  lastUpdate?: string;
}

export interface WifiNetwork {
  ssid: string;
  signal: number;
  secured: boolean;
}
