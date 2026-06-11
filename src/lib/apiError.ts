export function getApiErrorMessage(payload: any, fallback = 'Request failed') {
  if (Array.isArray(payload?.details) && payload.details.length > 0) {
    const detailText = payload.details
      .map((item: any) => item?.message)
      .filter(Boolean)
      .join('; ');
    if (detailText) return detailText;
  }

  return payload?.error || payload?.message || fallback;
}

export function safeParseApiResponse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}