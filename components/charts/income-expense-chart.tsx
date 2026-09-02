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
            tick={{ fill: "#6B6B67", fontSize: 11 }}
            axisLine={{ stroke: "rgba(23,23,23,0.10)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6B6B67", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={52}
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
            formatter={(value, name) => [fmtCurrency(Number(value)), name === "income" ? "Income" : "Expense"]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#6B6B67" }}
            formatter={(value) => (value === "income" ? "Income" : "Expense")}
          />
          <Bar dataKey="income" fill="#5F7358" radius={[3, 3, 0, 0]} maxBarSize={18} />
          <Bar dataKey="expense" fill="#B8954A" radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
