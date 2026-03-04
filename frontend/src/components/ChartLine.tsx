"use client";

import React from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

export default function ChartLine(props: any) {
  return <Line {...props} />;
}
