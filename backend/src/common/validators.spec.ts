import { isValidTimezone } from './validators';

describe('isValidTimezone', () => {
  it.each(['Asia/Ho_Chi_Minh', 'Asia/Saigon', 'UTC'])('accepts %s', (tz) => {
    expect(isValidTimezone(tz)).toBe(true);
  });
  it.each(['Mars/Base', '', 'x'.repeat(65), 42, undefined])('rejects %p', (tz) => {
    expect(isValidTimezone(tz)).toBe(false);
  });
});
