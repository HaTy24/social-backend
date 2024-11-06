import { Histogram, Registry, collectDefaultMetrics } from 'prom-client';

import { Injectable } from '@nestjs/common';

export interface HttpResponseRecordData {
  method: string;
  path: string;
  statusCode: string;
  duration: number;
}

@Injectable()
export class PrometheusGateway {
  protected register: Registry;
  protected httpDuration: Histogram<string>;

  constructor() {
    this.register = new Registry();

    collectDefaultMetrics({ register: this.register });

    this.httpDuration = new Histogram({
      name: 'http_request_duration_milliseconds',
      help: 'Duration of HTTP requests in milliseconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 500, 1000, 3000, 5000, 10000] // Example buckets in milliseconds
    });

    this.register.registerMetric(this.httpDuration);
  }

  public get contentType() {
    return this.register.contentType;
  }

  public getAllMetrics() {
    return this.register.metrics();
  }

  public recordHttpResponse(data: HttpResponseRecordData): void {
    return this.httpDuration
      .labels(data.method, data.path, data.statusCode)
      .observe(data.duration);
  }
}
