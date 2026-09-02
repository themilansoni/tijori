"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCurrency } from "@/lib/calculations";

export function SpendBarChart({
  data,
}: {
  data: { label: string; amount: number }[];
}) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#83858f", fontSize: 11 }}
            axisLine={{ stroke: "rgba(255,255,255,0.09)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#83858f", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#17181b",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#f2f3f5" }}
            formatter={(value) => [fmtCurrency(Number(value)), "Spent"]}
          />
          <Bar dataKey="amount" fill="#2bffb0" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
