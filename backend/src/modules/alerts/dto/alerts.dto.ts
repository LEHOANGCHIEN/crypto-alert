import { IntParam, OptionalEnum, PriceField, RequiredEnum, SymbolField } from '../../../common/validators';
import type { AlertCondition, AlertStatus } from '../alert-match';

export const ALERT_CONDITIONS = ['ABOVE', 'BELOW'] as const;
export const ALERT_STATUSES = ['ACTIVE', 'TRIGGERED'] as const;

/** POST /alerts (API.md §3.5). */
export class CreateAlertDto {
  @SymbolField() symbol!: string;
  @RequiredEnum(ALERT_CONDITIONS) condition!: AlertCondition;
  @PriceField() targetPrice!: number;
}

/** GET /alerts?status= */
export class ListAlertsQueryDto {
  @OptionalEnum(ALERT_STATUSES) status?: AlertStatus;
}

/** DELETE /alerts/:id */
export class AlertIdParamDto {
  @IntParam() id!: number;
}
