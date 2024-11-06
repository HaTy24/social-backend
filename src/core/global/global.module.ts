import { PrometheusGateway } from "@core/monitoring/prometheus.gateway";
import { Global, Module } from "@nestjs/common";


@Global()
@Module({
  providers: [PrometheusGateway],
  exports: [PrometheusGateway]
})
export class GlobalModule{ }