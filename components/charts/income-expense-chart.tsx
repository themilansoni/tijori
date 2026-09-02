"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { fmtCurrency } from "@/lib/calculations";
import type { IncomeExpensePoint } from "@/lib/calculations";

export function IncomeExpenseChart({ data }: { data: IncomeExpensePoint[] }) {
  return (
    <div className="h-[220px] w-full">
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
            width={52}
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
            formatter={(value, name) => [fmtCurrency(Number(value)), name === "income" ? "Income" : "Expense"]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#83858f" }}
            formatter={(value) => (value === "income" ? "Income" : "Expense")}
          />
          <Bar dataKey="income" fill="#2bffb0" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="expense" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
