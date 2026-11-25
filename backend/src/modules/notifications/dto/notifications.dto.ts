import { IntParam, OptionalIntRange } from '../../../common/validators';

/** GET /notifications?limit= (1–100, default 50). */
export class ListNotificationsQueryDto {
  @OptionalIntRange(1, 100) limit?: number;
}

/** POST /notifications/:id/read */
export class NotificationIdParamDto {
  @IntParam() id!: number;
}
