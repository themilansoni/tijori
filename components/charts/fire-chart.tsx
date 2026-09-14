"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { fmtCurrency } from "@/lib/calculations";
import type { FireProjectionPoint } from "@/lib/calculations";

export function FireChart({ data }: { data: FireProjectionPoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
            labelFormatter={(age) => `Age ${age}`}
            formatter={(value, name) => [fmtCurrency(Number(value)), name === "corpus" ? "Your corpus" : "FIRE target"]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--color-muted)" }}
            formatter={(value) => (value === "corpus" ? "Your corpus" : "FIRE target")}
          />
          <Line type="monotone" dataKey="corpus" stroke="var(--color-success)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="fireTarget" stroke="var(--color-accent)" strokeWidth={2} dot={false} strokeDasharray="4 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
