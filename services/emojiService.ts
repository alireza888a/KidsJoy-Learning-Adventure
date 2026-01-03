
/**
 * Utility to convert unicode emojis to high-quality 3D assets.
 * Optimized for specific 3D avatars in KidsJoy.
 */

// نقشه دستی برای آواتارهای اصلی جهت اطمینان ۱۰۰ درصدی از نمایش
const AVATAR_ASSET_MAP: Record<string, string> = {
  '🦁': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Lion/3D/lion_3d.png',
  '🧚': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fairy/3D/fairy_3d.png',
  '🤖': 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Robot/3D/robot_3d.png'
};

export const getHighResEmojiUrl = (emoji: string): string => {
  // اگر آواتار اصلی بود، از آدرس تست شده استفاده کن
  if (AVATAR_ASSET_MAP[emoji]) {
    return AVATAR_ASSET_MAP[emoji];
  }

  try {
    // برای سایر اموجی‌ها (در صورت نیاز در آینده) از CDN عمومی استفاده کن
    const codePoints = Array.from(emoji)
      .map(char => char.codePointAt(0)?.toString(16))
      .filter(hex => hex !== 'fe0f' && hex !== 'fe0e');
    
    const hexCode = codePoints.join("-").toLowerCase();
    // استفاده از سرور ورسل برای پایداری بیشتر رندرهای ۳ بعدی مایکروسافت
    return `https://fluent-emoji.vercel.app/api/fluent-emoji/${hexCode}/3d`;
  } catch (e) {
    return "";
  }
};
