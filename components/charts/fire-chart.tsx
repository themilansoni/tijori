"use client";

import { Area, AreaChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, ReferenceLine, ReferenceDot } from "recharts";
import { fmtCurrency, fmtCurrencyCompact } from "@/lib/calculations";
import type { FireProjectionPoint } from "@/lib/calculations";

export function FireChart({ data, fireAge }: { data: FireProjectionPoint[]; fireAge: number | null }) {
  const firePoint = fireAge != null ? data.find((p) => p.age === fireAge) : undefined;

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 4, left: -8, bottom: 0 }}>
          <XAxis
            dataKey="age"
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
            label={{ value: "Age", position: "insideBottom", offset: -2, fill: "var(--color-muted)", fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v) => fmtCurrencyCompact(Number(v))}
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
            labelFormatter={(age) => `Age ${age}`}
            formatter={(value, name) => [fmtCurrency(Number(value)), name === "corpus" ? "Your corpus" : "FIRE target"]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--color-muted)" }}
            formatter={(value) => (value === "corpus" ? "Your corpus" : "FIRE target")}
          />
          <Area
            type="monotone"
            dataKey="corpus"
            stroke="var(--color-success)"
            strokeWidth={2.5}
            fill="var(--color-success)"
            fillOpacity={0.08}
            dot={false}
          />
          <Line type="monotone" dataKey="fireTarget" stroke="var(--color-accent)" strokeWidth={2} dot={false} strokeDasharray="4 3" />
          {fireAge != null && (
            <ReferenceLine
              x={fireAge}
              stroke="var(--color-success)"
              strokeDasharray="3 3"
              label={{ value: `FI at ${fireAge}`, position: "top", fill: "var(--color-success)", fontSize: 11, fontWeight: 600 }}
            />
          )}
          {firePoint && (
            <ReferenceDot x={firePoint.age} y={firePoint.corpus} r={5} fill="var(--color-success)" stroke="var(--color-surface)" strokeWidth={2} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
