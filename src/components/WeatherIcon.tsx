import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Moon,
  Snowflake,
  Sun,
} from "lucide-react";
import { wmoIcon } from "@/lib/weather";
import { cn } from "@/lib/utils";

const ICONS = {
  clear: Sun,
  "clear-night": Moon,
  "partly-day": CloudSun,
  "partly-night": CloudMoon,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRainWind,
  showers: CloudRainWind,
  sleet: CloudHail,
  snow: CloudSnow,
  storm: CloudLightning,
  hail: CloudHail,
  flakes: Snowflake,
} as const;

interface WeatherIconProps {
  code: number;
  isDay?: boolean;
  className?: string;
  strokeWidth?: number;
}

export function WeatherIcon({
  code,
  isDay = true,
  className,
  strokeWidth = 1.25,
}: WeatherIconProps) {
  const key = wmoIcon(code, isDay) as keyof typeof ICONS;
  const Icon = ICONS[key] ?? Cloud;
  return (
    <Icon
      className={cn("text-foreground", className)}
      strokeWidth={strokeWidth}
      aria-hidden="true"
    />
  );
}
