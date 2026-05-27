import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 1000 }, // ramp up to 1000 VUs
    { duration: "2m", target: 1000 },  // sustain 1000 VUs for 2 minutes
    { duration: "30s", target: 0 },    // ramp down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"], // p95 response time must be under 800ms
    http_req_failed: ["rate<0.01"],   // error rate must be under 1%
  },
};

export default function () {
  const url = "http://localhost:3000/api/health";
  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.get(url, params);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response status is ok": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === "ok";
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);
}
