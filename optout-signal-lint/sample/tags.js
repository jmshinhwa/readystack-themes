// analytics/tags.js — loaded on every page from the site layout
export function boot(user, region) {
  if (navigator.doNotTrack === '1') return;
  gtag('consent', 'default', { ad_storage: 'granted', ad_user_data: 'granted' });
  gtag('config', 'AW-11423998', { allow_google_signals: true });
  fbq('init', '318844221', { em: user.email, ph: user.phone });
  ttq.load('CJK4L3BC77U');
  if (region === 'CA') showLink('Do Not Sell My Personal Information');
}
