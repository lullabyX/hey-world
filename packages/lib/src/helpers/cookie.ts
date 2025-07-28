export const getDomain = (): string => {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return '.' + parts.slice(-2).join('.');
  }
  return hostname;
};

export const setCookie = (
  name: string,
  value: string,
  options: { days?: number; domain?: string } = {}
) => {
  let cookie = `${name}=${value}`;
  if (options.days) {
    const date = new Date();
    date.setTime(date.getTime() + options.days * 24 * 60 * 60 * 1000);
    cookie += `; expires=${date.toUTCString()}`;
  }
  if (options.domain) cookie += `; domain=${options.domain}`;
  cookie += '; path=/';
  document.cookie = cookie;
};

export const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
};
