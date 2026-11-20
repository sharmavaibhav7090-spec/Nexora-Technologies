import React, { useState } from 'react';
import { formatCompactCurrency, formatCurrency } from '../utils/formatters';

interface DualBarDatum {
  label: string;
  primary: number;
  secondary: number;
}

export const DualBarChart: React.FC<{
  data: DualBarDatum[];
  primaryLabel: string;
  secondaryLabel: string;
  primaryColor?: string;
  secondaryColor?: string;
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
  height?: number;
}> = ({
  data,
  primaryLabel,
  secondaryLabel,
  primaryColor = '#1d4ed8',
  secondaryColor = '#94a3b8',
  currency = 'INR',
  height = 220,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const maxVal = Math.max(1, ...data.flatMap((d) => [d.primary, d.secondary]));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: primaryColor }} />
            <span>{primaryLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: secondaryColor }} />
            <span>{secondaryLabel}</span>
          </span>
        </div>
        {hoverIdx !== null && data[hoverIdx] && (
          <div className="font-mono tabular-nums text-slate-800">
            {data[hoverIdx].label}: {formatCurrency(data[hoverIdx].primary, currency)} vs{' '}
            {formatCurrency(data[hoverIdx].secondary, currency)}
          </div>
        )}
      </div>

      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[1, 0.75, 0.5, 0.25, 0].map((tick) => (
            <div key={tick} className="flex items-center gap-2 w-full">
              <span className="w-16 text-right text-[11px] font-mono tabular-nums text-slate-400">
                {formatCompactCurrency(maxVal * tick, currency)}
              </span>
              <div className="flex-1 border-b border-slate-100" />
            </div>
          ))}
        </div>

        <div className="absolute inset-0 pl-18 pb-5 pt-2 flex items-end gap-2">
          {data.map((d, idx) => {
            const pHeight = `${Math.max(2, (d.primary / maxVal) * 100)}%`;
            const sHeight = `${Math.max(2, (d.secondary / maxVal) * 100)}%`;
            return (
              <div
                key={d.label}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
                className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
              >
                <div className="w-full h-full flex items-end justify-center gap-1 px-0.5">
                  <div
                    className="w-1/2 max-w-[16px] rounded-t-xs transition-opacity"
                    style={{
                      height: d.primary > 0 ? pHeight : '2px',
                      backgroundColor: primaryColor,
                      opacity: hoverIdx === null || hoverIdx === idx ? 1 : 0.55,
                    }}
                  />
                  <div
                    className="w-1/2 max-w-[16px] rounded-t-xs transition-opacity"
                    style={{
                      height: d.secondary > 0 ? sHeight : '2px',
                      backgroundColor: secondaryColor,
                      opacity: hoverIdx === null || hoverIdx === idx ? 1 : 0.55,
                    }}
                  />
                </div>
                <span className="mt-1.5 text-[11px] font-mono text-slate-500">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const TrendLineChart: React.FC<{
  data: { label: string; value: number; secondaryValue?: number }[];
  label: string;
  secondaryLabel?: string;
  strokeColor?: string;
  secondaryColor?: string;
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
  height?: number;
}> = ({
  data,
  label,
  secondaryLabel,
  strokeColor = '#16a34a',
  secondaryColor = '#1d4ed8',
  currency = 'INR',
  height = 200,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const allVals = data.flatMap((d) =>
    d.secondaryValue !== undefined ? [d.value, d.secondaryValue, 0] : [d.value, 0]
  );
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(1, ...allVals);
  const range = Math.max(1, maxVal - minVal);

  const width = 640;
  const padX = 20;
  const padY = 16;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const toX = (i: number) =>
    data.length <= 1 ? padX : padX + (i / (data.length - 1)) * plotW;
  const toY = (v: number) => padY + ((maxVal - v) / range) * plotH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.value).toFixed(1)}`)
    .join(' ');

  const secPath =
    secondaryLabel && data.some((d) => d.secondaryValue !== undefined)
      ? data
          .map(
            (d, i) =>
              `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.secondaryValue ?? 0).toFixed(1)}`
          )
          .join(' ')
      : null;

  const zeroY = toY(0);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5" style={{ backgroundColor: strokeColor }} />
            <span>{label}</span>
          </span>
          {secondaryLabel && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5" style={{ backgroundColor: secondaryColor }} />
              <span>{secondaryLabel}</span>
            </span>
          )}
        </div>
        {hoverIdx !== null && data[hoverIdx] && (
          <span className="font-mono tabular-nums text-slate-800">
            {data[hoverIdx].label}: {formatCurrency(data[hoverIdx].value, currency)}
            {data[hoverIdx].secondaryValue !== undefined
              ? ` · ${formatCurrency(data[hoverIdx].secondaryValue, currency)}`
              : ''}
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" style={{ height }}>
        <line
          x1={padX}
          y1={zeroY}
          x2={width - padX}
          y2={zeroY}
          stroke="#e2e8f0"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <path d={linePath} fill="none" stroke={strokeColor} strokeWidth={2.5} />
        {secPath && (
          <path
            d={secPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}
        {data.map((d, i) => (
          <g
            key={d.label}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            className="cursor-pointer"
          >
            <circle
              cx={toX(i)}
              cy={toY(d.value)}
              r={hoverIdx === i ? 5 : 3.5}
              fill={d.value >= 0 ? strokeColor : '#dc2626'}
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            {d.secondaryValue !== undefined && (
              <circle
                cx={toX(i)}
                cy={toY(d.secondaryValue)}
                r={hoverIdx === i ? 4.5 : 3}
                fill={secondaryColor}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            )}
            <text
              x={toX(i)}
              y={height - 2}
              textAnchor="middle"
              className="fill-slate-400 text-[10px] font-mono"
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const HorizontalBarBreakdown: React.FC<{
  items: { name: string; value: number }[];
  color?: string;
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
  emptyLabel?: string;
}> = ({ items, color = '#1d4ed8', currency = 'INR', emptyLabel = 'No records in active filter.' }) => {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500 py-6">{emptyLabel}</p>;
  }
  const total = items.reduce((s, i) => s + Math.max(0, i.value), 0);
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="space-y-3">
      {items.slice(0, 6).map((item) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        const barW = Math.max(3, (item.value / max) * 100);
        return (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 truncate pr-3">{item.name}</span>
              <span className="font-mono tabular-nums text-slate-600 shrink-0">
                {formatCurrency(item.value, currency)} · {pct.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-xs overflow-hidden">
              <div className="h-full rounded-xs" style={{ width: `${barW}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
