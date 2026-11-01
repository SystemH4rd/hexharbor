export const MODES = Object.freeze(['phone', 'email', 'photo']);
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
export function validateInput(mode, value, photo) {
  if (mode === 'photo') {
    if (!photo) return 'Выберите изображение или откройте демопример.';
    if (photo.demo) return '';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type)) return 'Поддерживаются только JPEG, PNG и WebP.';
    if (photo.size <= 0 || photo.size > MAX_PHOTO_SIZE) return 'Изображение должно быть не пустым и не больше 5 МБ.';
    return '';
  }
  const text = String(value || '').trim();
  if (!text) return mode === 'phone' ? 'Введите номер телефона.' : 'Введите email.';
  if (mode === 'phone') {
    if (!/^\+[\d\s().-]+$/.test(text)) return 'Укажите международный номер, начиная с + и кода страны.';
    const digits = text.replace(/\D/g, '');
    return /^[1-9]\d{6,14}$/.test(digits) ? '' : 'Номер должен содержать от 7 до 15 цифр с кодом страны.';
  }
  if (mode === 'email') return text.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? '' : 'Проверьте формат email: name@example.org.';
  return 'Неизвестный тип анализа.';
}
export function filterResults(results, filter = 'all') {
  return filter === 'all' ? [...results] : results.filter(r => r.verificationStatus === filter);
}
export function summarize(results) {
  return {total: results.length, verified: results.filter(r => r.verificationStatus === 'verified').length, unverified: results.filter(r => r.verificationStatus === 'unverified').length};
}
export function makeExport(inputType, results) {
  return {application: 'HexHarbor', mode: 'demo', inputType, containsRealFindings: false, results: results.map(r => ({...r}))};
}
export function createRunGate() {
  let version = 0;
  return {next: () => ++version, isCurrent: ticket => ticket === version, cancel: () => ++version};
}

