import client from "prom-client";

// Collect default Node.js metrics (CPU, memory, event loop)
client.collectDefaultMetrics({
  prefix: "mern_",
});

export const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_ms",
  help: "HTTP request duration in ms",
  labelNames: ["method", "route", "status"],
  buckets: [50, 100, 200, 300, 500, 1000, 2000],
});

export const register = client.register;