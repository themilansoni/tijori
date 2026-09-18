"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCurrency } from "@/lib/calculations";

export type NetWorthPoint = { label: string; netWorth: number };

export function NetWorthChart({ data }: { data: NetWorthPoint[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={64}
            tickFormatter={(v) => fmtCurrency(Number(v))}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-border)" }}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "var(--shadow-md)",
            }}
            labelStyle={{ color: "var(--color-foreground)" }}
            formatter={(value) => [fmtCurrency(Number(value)), "Net worth"]}
          />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="var(--color-accent)"
            fillOpacity={0.12}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
