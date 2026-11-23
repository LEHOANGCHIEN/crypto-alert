import vi from './locales/vi.json';
import en from './locales/en.json';

function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('i18n key parity', () => {
  it('vi.json and en.json have exactly the same keys', () => {
    expect(keys(vi).sort()).toEqual(keys(en).sort());
  });
  it('official title and course line are identical (Vietnamese) in both languages', () => {
    expect(en.footer.title).toBe(vi.footer.title);
    expect(en.footer.course).toBe(vi.footer.course);
    expect(vi.footer.title).toBe(
      'Xây dựng ứng dụng web theo dõi thị trường tiền mã hóa với biểu đồ kỹ thuật thời gian thực và cảnh báo giá',
    );
  });
});
