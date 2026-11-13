'use client';

import React, { useState } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useReducedMotion } from 'motion/react';
import type { OrderStatus } from '@/types/store';
import type { SeriesPoint } from '@/types/admin';
import { formatBDT, formatBDTCompact, formatNumber } from '@/lib/format';
import { STATUS_META } from '@/lib/order-meta';

const PRIMARY = '#1a663b';
const GRID = '#e8f0eb';
const AXIS = '#3f5649';

function ChartTooltip({
  active,
  payload,
  label,
  metric,
}: {
  active?: boolean;
  payload?: { value: number; payload: SeriesPoint }[];
  label?: string;
  metric: 'revenue' | 'orders';
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/10 bg-forest px-3.5 py-2.5 text-white shadow-pop">
      <p className="text-xs font-medium text-[#cfe3d6]">{label}</p>
      <p className="tabular mt-0.5 text-[15px] font-semibold">
        {metric === 'revenue' ? formatBDT(p.revenue) : `${formatNumber(p.orders)} orders`}
      </p>
      <p className="tabular text-xs text-[#cfe3d6]">
        {metric === 'revenue' ? `${formatNumber(p.orders)} orders` : formatBDT(p.revenue)}
      </p>
    </div>
  );
}

/** One measure at a time (single axis): revenue or orders over the range. */
export function TrendChart({ data, metric }: { data: SeriesPoint[]; metric: 'revenue' | 'orders' }) {
  const reduce = useReducedMotion();
  const tickEvery = Math.max(1, Math.ceil(data.length / 8));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="fb-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.22} />
            <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={tickEvery - 1}
          tick={{ fill: AXIS, fontSize: 12 }}
          dy={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          allowDecimals={false}
          tick={{ fill: AXIS, fontSize: 12 }}
          tickFormatter={(v: number) => (metric === 'revenue' ? formatBDTCompact(v) : formatNumber(v))}
        />
        <Tooltip
          cursor={{ stroke: PRIMARY, strokeWidth: 1, strokeDasharray: '4 4' }}
          content={(props) => (
            <ChartTooltip
              active={props.active}
              payload={props.payload as unknown as { value: number; payload: SeriesPoint }[]}
              label={props.label as string}
              metric={metric}
            />
          )}
        />
        <Area
          key={metric}
          type="monotone"
          dataKey={metric}
          stroke={PRIMARY}
          strokeWidth={2}
          fill="url(#fb-area)"
          isAnimationActive={!reduce}
          animationDuration={700}
          animationEasing="ease-out"
          activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2, fill: PRIMARY }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Orders-by-status donut with a labelled legend (identity never by colour alone). */
export function StatusDonut({ data }: { data: { status: OrderStatus; count: number }[] }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<OrderStatus | null>(null);
  const total = data.reduce((s, d) => s + d.count, 0);
  const shown = data.filter((d) => d.count > 0);
  const focus = hover ? data.find((d) => d.status === hover) : null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5 px-5 pb-5 pt-5">
      <div className="relative h-[168px] w-[168px] shrink-0">
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={shown}
                dataKey="count"
                nameKey="status"
                innerRadius={56}
                outerRadius={80}
                paddingAngle={shown.length > 1 ? 1.5 : 0}
                cornerRadius={3}
                stroke="none"
                isAnimationActive={!reduce}
                animationDuration={700}
                onMouseEnter={(_, i) => setHover(shown[i]?.status ?? null)}
                onMouseLeave={() => setHover(null)}
              >
                {shown.map((d) => (
                  <Cell key={d.status} fill={STATUS_META[d.status].color} opacity={hover && hover !== d.status ? 0.35 : 1} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-full border-[24px] border-[#eef3f0]" />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="font-display tabular text-2xl font-semibold leading-none text-ink">{formatNumber(focus ? focus.count : total)}</p>
          <p className="mt-1 text-xs font-medium text-muted">{focus ? STATUS_META[focus.status].short : 'orders'}</p>
        </div>
      </div>
      <ul className="grid min-w-[200px] flex-1 grid-cols-[auto_1fr_auto_3rem] items-center gap-x-2.5 gap-y-2" aria-label="Orders by status">
        {data.map((d) => (
          <li
            key={d.status}
            onMouseEnter={() => setHover(d.status)}
            onMouseLeave={() => setHover(null)}
            className="col-span-4 grid grid-cols-subgrid items-center text-[13px]"
          >
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[d.status].color }} />
            <span className="truncate text-ink">{STATUS_META[d.status].short}</span>
            <span className="tabular text-right font-semibold text-ink">{d.count}</span>
            <span className="tabular text-right text-muted">{total ? Math.round((d.count / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
