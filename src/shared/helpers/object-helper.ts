
export const tryParseJSON = (data: any, nullIfNotValid = true) => {
  try {
    if (typeof data === 'object') {
      return data;
    }

    if (typeof data !== 'string') {
      return nullIfNotValid ? null : data;
    }

    if (!data?.length) {
      return null;
    }

    return JSON.parse(data)
  } catch (error) {
    return nullIfNotValid ? null : data;
  }
}