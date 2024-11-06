import sanitizeHtml from 'sanitize-html';

export const cleanHTML = (data: string): string => {
  return sanitizeHtml(data, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: {
      a: ['href'],
    },
  });
};

export const cleanAlphaNumeric = (data: string): string => {
  return data.replace(/[^a-zA-Z0-9]/g, '');
};

export const cleanAlphaNumericWithSpace = (data: string): string => {
  return data.replace(/[^a-zA-Z0-9 ]/g, '').trim();
};

export const cleanText = (data: string): string => {
  return data.replace(/[^a-zA-Z ]/g, '');
};

export const cleanTextNoSpace = (data: string): string => {
  return data.replace(/[^a-zA-Z]/g, '');
};

export const cleanTextWithUnderscore = (data: string): string => {
  return data.replace(/[^a-zA-Z0-9_ ]/g, '');
};

export const cleanEmail = (data: string): string => {
  return data.replace(/[^a-zA-Z0-9@\\.]/g, '');
};

export const cleanNumber = (data: string): string => {
  return data.replace(/[^0-9]/g, '');
};

export const cleanDate = (data: string): string => {
  return data.replace(/[^0-9-]/g, '');
};
