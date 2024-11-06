import { Response as AppResponse } from 'express';

import { Controller, Get, Response } from '@nestjs/common';
import { PrometheusGateway } from '@core/monitoring/prometheus.gateway';


@Controller('metrics')
export class MetricsController {
  constructor(protected promGateway: PrometheusGateway) {}

  @Get()
  public async getMetrics(@Response() res: AppResponse): Promise<void> {
    res.set('Content-Type', this.promGateway.contentType);

    const metrics = await this.promGateway.getAllMetrics();

    res.end(metrics);
  }
}
