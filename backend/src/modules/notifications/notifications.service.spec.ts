import type { NotificationChannel } from './channels/notification-channel.interface';
import type { NotificationRecord } from './notification.types';
import { NotificationsService } from './notifications.service';

const n: NotificationRecord = {
  id: 1,
  type: 'ALERT_TRIGGERED',
  payload: { alertId: 2, symbol: 'BTCUSDT', condition: 'ABOVE', targetPrice: 10, triggeredPrice: 11 },
  readAt: null,
  createdAt: new Date(0),
};

describe('NotificationsService.dispatch', () => {
  it('sends to every channel; a failing channel does not stop the others or throw', async () => {
    const ok: NotificationChannel = { name: 'ok', send: jest.fn().mockResolvedValue(undefined) };
    const bad: NotificationChannel = { name: 'bad', send: jest.fn().mockRejectedValue(new Error('boom')) };
    const svc = new NotificationsService([bad, ok], {} as never, {} as never);
    jest.spyOn((svc as unknown as { logger: { error: () => void } }).logger, 'error').mockImplementation(() => undefined);
    await expect(svc.dispatch(7, n)).resolves.toBeUndefined();
    expect(bad.send).toHaveBeenCalledWith(7, n);
    expect(ok.send).toHaveBeenCalledWith(7, n);
  });
});
