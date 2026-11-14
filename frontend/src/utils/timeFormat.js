export const formatSecondsToHHMMSS = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, '0'))
    .join(':');
};

export const secondsToHMS = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  return {
    hours: Math.floor(safeSeconds / 3600),
    minutes: Math.floor((safeSeconds % 3600) / 60),
    seconds: safeSeconds % 60,
  };
};

export const hmsToSeconds = (hours = 0, minutes = 0, seconds = 0) => {
  const h = Math.max(0, Math.floor(Number(hours) || 0));
  const m = Math.max(0, Math.floor(Number(minutes) || 0));
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  return h * 3600 + m * 60 + s;
};

export const parseHHMMSSToSeconds = (value) => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return Math.max(0, Math.floor(value));
  }
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return Math.max(0, parseInt(trimmed, 10));
  }

  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  if (parts.some((p) => !/^\d+$/.test(p))) return null;

  if (parts.length === 2) {
    const [m, s] = parts.map((p) => parseInt(p, 10));
    if (s >= 60) return null;
    return m * 60 + s;
  }

  const [h, m, s] = parts.map((p) => parseInt(p, 10));
  if (m >= 60 || s >= 60) return null;
  return h * 3600 + m * 60 + s;
};

export const calculateProgressPercentage = (currentSeconds, totalDurationMinutes) => {
  const totalSec = (Number(totalDurationMinutes) || 0) * 60;
  if (totalSec <= 0) return null;
  const pct = (Math.max(0, Number(currentSeconds) || 0) / totalSec) * 100;
  return Math.min(100, Math.round(pct));
};

export const formatDateTime = (isoString) => {
  if (!isoString) return 'No registrado';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Fecha invalida';
  return date.toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

