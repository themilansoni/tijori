"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCurrency } from "@/lib/calculations";

const TONE_COLOR = { gold: "#B8954A", sage: "#5F7358" };

export function SpendBarChart({
  data,
  tone = "gold",
}: {
  data: { label: string; amount: number }[];
  tone?: "gold" | "sage";
}) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#6B6B67", fontSize: 11 }}
            axisLine={{ stroke: "rgba(23,23,23,0.10)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6B6B67", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ fill: "rgba(23,23,23,0.04)" }}
            contentStyle={{
              background: "#ffffff",
              border: "1px solid rgba(23,23,23,0.10)",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "0 8px 24px rgba(23,23,23,0.08)",
            }}
            labelStyle={{ color: "#171717" }}
            formatter={(value) => [fmtCurrency(Number(value)), "Amount"]}
          />
          <Bar dataKey="amount" fill={TONE_COLOR[tone]} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
