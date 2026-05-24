/**
 * Send files to Telegram Bot API (multipart).
 */
async function sendTelegramDocument(token, { chatId, buffer, filename, mimeType, caption }) {
  if (!token || !chatId || !buffer?.length) {
    return { ok: false, description: 'Missing token, chatId, or file data' };
  }
  const base = `https://api.telegram.org/bot${token}`;
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if (caption) {
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
  }
  const blob = new Blob([buffer], { type: mimeType || 'application/octet-stream' });
  form.append('document', blob, filename || 'receipt');
  const res = await fetch(`${base}/sendDocument`, { method: 'POST', body: form });
  const data = await res.json();
  if (!data.ok) {
    console.error('Telegram sendDocument:', data.description || data);
  }
  return data;
}

module.exports = { sendTelegramDocument };
